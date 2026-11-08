import { Scene } from '../core/types';
import { ratioToValue } from '../core/rational';
import { SPECTRUM_WORKLET_CODE } from './worklets/spectrum-synth.worklet';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private masterGainNode: GainNode | null = null;
  private isUnlocked: boolean = false;
  private isMutedForFocus: boolean = false;

  private scene: Scene;

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

        this.masterGainNode = this.ctx.createGain();
        this.masterGainNode.gain.setValueAtTime(this.scene.audio.masterGain, this.ctx.currentTime);

        this.workletNode.connect(this.masterGainNode);
        this.masterGainNode.connect(this.ctx.destination);
      }

      this.isUnlocked = true;
      this.syncSceneToWorklet();
      return true;
    } catch (e) {
      console.warn('[AudioEngine] Failed to unlock audio context:', e);
      return false;
    }
  }

  public updateScene(scene: Scene): void {
    this.scene = scene;
    if (this.masterGainNode && this.ctx) {
      const targetGain = this.isMutedForFocus ? 0 : scene.audio.masterGain;
      this.masterGainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.02);
    }
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

    this.workletNode.port.postMessage({
      type: 'UPDATE_SCENE',
      payload: {
        shapes: payloadShapes,
        audioMode: this.scene.audio.audioMode,
        masterGain: this.scene.audio.masterGain,
        tplHz: this.scene.anchors.tplFrequencyHz,
      },
    });
  }

  private handleFocusChange(focused: boolean): void {
    if (!this.scene.cosmetics.focusModeEnabled) return;
    this.isMutedForFocus = !focused;
    if (this.masterGainNode && this.ctx) {
      const targetGain = focused ? this.scene.audio.masterGain : 0;
      this.masterGainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.02);
    }
  }

  public getContext(): AudioContext | null {
    return this.ctx;
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
