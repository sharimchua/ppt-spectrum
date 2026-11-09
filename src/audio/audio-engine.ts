import { Scene, VoiceId, ADSREnvelope } from '../core/types';
import { ratioToValue } from '../core/rational';
import { calculateFilterGain } from '../core/shape';
import { SPECTRUM_WORKLET_CODE } from './worklets/spectrum-synth.worklet';

export interface WorkletPartialPayload {
  ratio: number;
  amp: number;
  phaseOffset: number;
  voice?: VoiceId;
}

export interface WorkletShapePayload {
  shapeId: string;
  placementD: number;
  gain: number;
  mute: boolean;
  partials: WorkletPartialPayload[];
  adsr?: ADSREnvelope;
}

/**
 * Pure function mapping Scene placements and shapes to AudioWorklet payloads,
 * applying active Band Filter attenuation to partial amplitudes.
 */
export function buildAudioPayloadShapes(scene: Scene): WorkletShapePayload[] {
  return scene.placements.map((placement) => {
    const shapeObj = scene.shapes.find((s) => s.id === placement.shapeId);
    const partials = (shapeObj ? shapeObj.partials : []).map((p) => {
      const ratioVal = ratioToValue(p.ratio);
      const partialD = placement.d - Math.log2(ratioVal);
      const filterGain = scene.filter ? calculateFilterGain(partialD, scene.filter, placement.d) : 1.0;
      return {
        ratio: ratioVal,
        amp: p.amp * filterGain,
        phaseOffset: p.phase,
        voice: p.voice,
      };
    });

    return {
      shapeId: placement.shapeId,
      placementD: placement.d,
      gain: placement.gain,
      mute: placement.mute,
      partials,
      adsr: shapeObj?.adsr,
    };
  });
}

export interface AudioTelemetryData {
  phases: Record<string, { masterPhase: number; f0: number; smoothedD: number }>;
  currentTime: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private masterGainNode: GainNode | null = null;
  private isUnlocked: boolean = false;
  private isMutedForFocus: boolean = false;
  private isPlaying: boolean = false;

  private scene: Scene;
  private latestTelemetry: AudioTelemetryData | null = null;
  private latestTelemetryTime: number = 0;

  constructor(initialScene: Scene) {
    this.scene = initialScene;
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => this.handleFocusChange(true));
      window.addEventListener('blur', () => this.handleFocusChange(false));
    }
  }

  public async unlock(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioContextClass();
      }

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      // iOS silent buffer trigger
      const silentBuffer = this.ctx.createBuffer(1, 1, 22050);
      const source = this.ctx.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(this.ctx.destination);
      source.start(0);

      if (!this.workletNode) {
        const blob = new Blob([SPECTRUM_WORKLET_CODE], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        await this.ctx.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);

        this.workletNode = new AudioWorkletNode(this.ctx, 'spectrum-synth-processor', {
          outputChannelCount: [2],
        });

        this.workletNode.port.onmessage = (event) => {
          if (event.data?.type === 'AUDIO_SYNC') {
            this.latestTelemetry = event.data.payload;
            this.latestTelemetryTime = performance.now();
          }
        };

        this.masterGainNode = this.ctx.createGain();
        this.masterGainNode.gain.setValueAtTime(0, this.ctx.currentTime);

        this.workletNode.connect(this.masterGainNode);
        this.masterGainNode.connect(this.ctx.destination);
      }

      this.isUnlocked = true;
      this.applyMasterGain();
      this.syncSceneToWorklet();
      return true;
    } catch (e) {
      console.warn('[AudioEngine] Failed to unlock audio context:', e);
      return false;
    }
  }

  public async play(): Promise<boolean> {
    const ok = await this.unlock();
    if (!ok) return false;
    this.isPlaying = true;
    this.applyMasterGain();
    this.syncSceneToWorklet();
    return true;
  }

  public pause(): void {
    this.isPlaying = false;
    this.applyMasterGain();
    this.syncSceneToWorklet();
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Returns current note age in seconds for a shape, enabling visualizations
   * to accurately render dynamic harmonic damping and ADSR levels.
   */
  public getNoteAge(shapeId?: string): number {
    const id = shapeId || this.scene.placements[0]?.shapeId;
    if (!id || !this.latestTelemetry?.phases?.[id]) return 0;
    const baseAge = (this.latestTelemetry.phases[id] as { noteAge?: number }).noteAge || 0;
    const elapsedSec = (performance.now() - this.latestTelemetryTime) / 1000;
    return baseAge + Math.max(0, elapsedSec);
  }

  /**
   * Triggers an acoustic note envelope strike (ADSR reset) for placed shapes in pitch space.
   * If playback is paused, unlocks audio context and plays an audition note that rings out fully.
   */
  public async triggerNote(shapeId?: string): Promise<void> {
    const ok = await this.unlock();
    if (!ok || !this.workletNode) return;

    // If playback is not active, allow the user to audition the note strike
    if (!this.isPlaying && this.masterGainNode && this.ctx) {
      const now = this.ctx.currentTime;
      const targetGain = this.scene.audio.masterGain || 0.75;
      this.syncSceneToWorklet();

      // Find shape ADSR decay to determine audition hold duration
      const targetShape = this.scene.shapes.find(
        (s) => (shapeId ? s.id === shapeId : s.id === this.scene.placements[0]?.shapeId)
      );
      const ringSec = Math.max(1.5, (targetShape?.adsr?.attack || 0.01) + (targetShape?.adsr?.decay || 1.2) * 1.35);

      this.masterGainNode.gain.cancelScheduledValues(now);
      this.masterGainNode.gain.setValueAtTime(targetGain, now);
      this.masterGainNode.gain.setValueAtTime(targetGain, now + ringSec);
      this.masterGainNode.gain.linearRampToValueAtTime(0, now + ringSec + 0.35);
    }

    this.workletNode.port.postMessage({
      type: 'TRIGGER_NOTE',
      payload: { shapeId },
    });
  }

  private applyMasterGain(): void {
    if (this.masterGainNode && this.ctx) {
      const targetGain = (this.isPlaying && !this.isMutedForFocus) ? this.scene.audio.masterGain : 0;
      this.masterGainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.02);
    }
  }

  public updateScene(scene: Scene): void {
    this.scene = scene;
    this.applyMasterGain();
    this.syncSceneToWorklet();
  }

  private syncSceneToWorklet(): void {
    if (!this.workletNode) return;

    const payloadShapes = buildAudioPayloadShapes(this.scene);
    const effectiveGain = (this.isPlaying && !this.isMutedForFocus) ? this.scene.audio.masterGain : 0;

    this.workletNode.port.postMessage({
      type: 'UPDATE_SCENE',
      payload: {
        shapes: payloadShapes,
        audioMode: this.scene.audio.audioMode,
        masterGain: effectiveGain,
        tplHz: this.scene.anchors.tplFrequencyHz,
      },
    });
  }

  private handleFocusChange(focused: boolean): void {
    if (!this.scene.cosmetics.focusModeEnabled) return;
    this.isMutedForFocus = !focused;
    this.applyMasterGain();
    this.syncSceneToWorklet();
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public getAudioTelemetry(): AudioTelemetryData | null {
    return this.latestTelemetry;
  }

  public getMasterPhase(shapeId: string): number {
    if (!this.isUnlocked || !this.isPlaying || this.isMutedForFocus || this.scene.audio.masterGain <= 0.0001) {
      return 0.0;
    }
    const shapeData = this.latestTelemetry?.phases?.[shapeId];
    if (!shapeData) return 0.0;

    const dt = (performance.now() - this.latestTelemetryTime) / 1000.0;
    return (shapeData.masterPhase + shapeData.f0 * dt) % 1.0;
  }

  public isAudioActive(): boolean {
    return this.isUnlocked && this.isPlaying && !this.isMutedForFocus && this.scene.audio.masterGain > 0.0001;
  }

  public isReady(): boolean {
    return this.isUnlocked && this.ctx !== null && this.ctx.state === 'running';
  }

  public destroy(): void {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.workletNode = null;
      this.masterGainNode = null;
      this.isUnlocked = false;
    }
  }
}
