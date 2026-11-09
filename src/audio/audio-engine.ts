import { Scene } from '../core/types';
import { ratioToValue } from '../core/rational';
import { SPECTRUM_WORKLET_CODE } from './worklets/spectrum-synth.worklet';

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

    const payloadShapes = this.scene.placements.map((placement) => {
      const shapeObj = this.scene.shapes.find((s) => s.id === placement.shapeId);
      const partials = (shapeObj ? shapeObj.partials : []).map((p) => ({
        ratio: ratioToValue(p.ratio),
        amp: p.amp,
        phaseOffset: p.phase,
        voice: p.voice,
      }));

      return {
        shapeId: placement.shapeId,
        placementD: placement.d,
        gain: placement.gain,
        mute: placement.mute,
        partials,
      };
    });

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
