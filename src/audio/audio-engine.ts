import { Scene, VoiceId, ADSREnvelope, Filter } from '../core/types';
import { DEFAULT_SCENE } from '../core/config';
import { ratioToValue } from '../core/rational';
import { calculateFilterGain, getFilterablePartials } from '../core/shape';
import { evaluateStaticMatch, applyFilterAction, compileFilterForWorklet } from '../core/filter-eval';
import { SPECTRUM_WORKLET_CODE } from './worklets/spectrum-synth.worklet';

export interface WorkletPartialPayload {
  ratio: number;
  amp: number;
  phaseOffset: number;
  voice?: VoiceId;
  staticMatch?: number;
}

export interface WorkletShapePayload {
  shapeId: string;
  placementD: number;
  gain: number;
  mute: boolean;
  partials: WorkletPartialPayload[];
  adsr?: ADSREnvelope;
  ratioToScene?: number;
  isPrimary?: boolean;
}

/**
 * Pure function mapping Scene placements and shapes to AudioWorklet payloads,
 * calculating static filter matches and duty gain for partials.
 */
export function buildAudioPayloadShapes(scene: Scene): WorkletShapePayload[] {
  const sceneD = scene.placements[0]?.d ?? 0;
  return scene.placements.map((placement, placementIdx) => {
    const shapeObj = scene.shapes.find((s) => s.id === placement.shapeId);
    const filterablePartials = shapeObj ? getFilterablePartials(shapeObj) : [];

    const hasModernFilter = Boolean(
      scene.filter && scene.filter.enabled && 'conditions' in scene.filter
    );
    const hasActiveRangeConds = Boolean(
      hasModernFilter &&
        (scene.filter as Filter).conditions.some((c) => c.kind === 'range' && c.enabled !== false)
    );

    const partials = filterablePartials.map((p) => {
      const ratioVal = ratioToValue(p.ratio);
      const partialD = placement.d - Math.log2(ratioVal);

      // Range conditions statically attenuate frequency bands.
      // Cycle conditions are evaluated dynamically per onset inside the AudioWorklet.
      let staticGain = 1.0;
      if (hasActiveRangeConds && scene.filter && 'conditions' in scene.filter) {
        const staticMatch = evaluateStaticMatch(scene.filter as Filter, {
          partialD,
          sceneD,
          ratio: p.ratio,
          phase: p.phase,
          anchorRatio: p.anchorRatio,
          placementD: placement.d,
          tplHz: scene.anchors.tplFrequencyHz,
        });
        staticGain = applyFilterAction(
          staticMatch,
          (scene.filter as Filter).action,
          (scene.filter as Filter).depth
        );
      } else if (!hasModernFilter && scene.filter) {
        staticGain = calculateFilterGain(partialD, scene.filter, sceneD);
      }

      return {
        ratio: ratioVal,
        amp: p.amp * staticGain,
        phaseOffset: p.phase,
        voice: p.voice,
        staticMatch: undefined,
      };
    });

    return {
      shapeId: placement.shapeId,
      placementD: placement.d,
      gain: placement.gain,
      mute: placement.mute,
      partials,
      adsr: shapeObj?.adsr,
      ratioToScene: Math.pow(2, sceneD - placement.d),
      isPrimary: placementIdx === 0,
    };
  });
}

export interface AudioTelemetryData {
  phases: Record<string, { masterPhase: number; f0: number; smoothedD: number; noteAge?: number; isAuditioning?: boolean }>;
  currentTime: number;
}

export class AudioEngine {
  private static instance: AudioEngine | null = null;

  public static getInstance(initialScene?: Scene): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine(initialScene || DEFAULT_SCENE);
    } else if (initialScene) {
      AudioEngine.instance.updateScene(initialScene);
    }
    return AudioEngine.instance;
  }

  public static resetInstanceForTesting(): void {
    if (AudioEngine.instance) {
      AudioEngine.instance.destroy();
      AudioEngine.instance = null;
    }
  }

  private ctx: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private fallbackProcessorNode: ScriptProcessorNode | null = null;
  private fallbackPort: { postMessage: (msg: unknown) => void; onmessage: ((ev: { data: unknown }) => void) | null } | null = null;
  private masterGainNode: GainNode | null = null;
  private masterLimiterNode: DynamicsCompressorNode | null = null;
  private isUnlocked: boolean = false;
  private isMutedForFocus: boolean = false;
  private isPlaying: boolean = false;
  private isKeyDownLocal: boolean = false;
  private isAuditioningLocal: boolean = false;
  private playStartTime: number = 0;

  private scene!: Scene;
  private latestTelemetry: AudioTelemetryData | null = null;
  private latestTelemetryTime: number = 0;

  constructor(initialScene: Scene) {
    if (AudioEngine.instance) {
      AudioEngine.instance.updateScene(initialScene);
      return AudioEngine.instance;
    }
    this.scene = initialScene;
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', this.onFocus);
      window.addEventListener('blur', this.onBlur);
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', this.onVisibilityChange);
      }
      (window as unknown as { __PPT_AUDIO_ENGINE__?: AudioEngine }).__PPT_AUDIO_ENGINE__ = this;
    }
    AudioEngine.instance = this;
  }

  private onFocus = (): void => this.handleFocusChange(true);
  private onBlur = (): void => this.handleFocusChange(false);
  private onVisibilityChange = (): void => {
    if (typeof document !== 'undefined') {
      this.handleFocusChange(!document.hidden);
    }
  };

  private handleTelemetryEvent = (event: { data: unknown }): void => {
    const data = event.data as { type?: string; payload?: AudioTelemetryData } | null;
    if (data?.type === 'AUDIO_SYNC' && data.payload) {
      this.latestTelemetry = data.payload;
      this.latestTelemetryTime = performance.now();
      const anyAuditioning = Boolean(
        this.latestTelemetry?.phases &&
        Object.values(this.latestTelemetry.phases).some((p) => p.isAuditioning)
      );
      if (!anyAuditioning && !this.isKeyDownLocal) {
        this.isAuditioningLocal = false;
      }
    }
  };

  private postToSynth(msg: unknown): void {
    if (this.workletNode) {
      this.workletNode.port.postMessage(msg);
    } else if (this.fallbackPort) {
      this.fallbackPort.postMessage(msg);
    }
  }

  private hasSynthNode(): boolean {
    return Boolean(this.workletNode || this.fallbackProcessorNode);
  }

  /**
   * Instantiates a main-thread ScriptProcessorNode running the exact same SpectrumSynthProcessor
   * when AudioWorklet is unavailable (e.g. mobile testing over HTTP LAN where isSecureContext is false,
   * or restricted mobile WebViews).
   */
  private initScriptProcessorFallback(ctx: AudioContext): boolean {
    try {
      if (typeof ctx.createScriptProcessor !== 'function') return false;
      const scriptNode = ctx.createScriptProcessor(1024, 0, 2);

      let processorMessageHandler: ((ev: { data: unknown }) => void) | null = null;
      const portShim = {
        set onmessage(fn: ((ev: { data: unknown }) => void) | null) {
          processorMessageHandler = fn;
        },
        get onmessage() {
          return processorMessageHandler;
        },
        postMessage: (data: unknown) => {
          this.handleTelemetryEvent({ data });
        },
      };

      class BaseWorkletProcessorShim {
        public port = portShim;
      }

      let RegisteredClass: (new () => { process: (inputs: Float32Array[][], outputs: Float32Array[][]) => boolean }) | null = null;
      const registerProcessorShim = (
        _name: string,
        cls: new () => { process: (inputs: Float32Array[][], outputs: Float32Array[][]) => boolean }
      ) => {
        RegisteredClass = cls;
      };

      const factory = new Function(
        'AudioWorkletProcessor',
        'registerProcessor',
        'sampleRate',
        'currentTime',
        `${SPECTRUM_WORKLET_CODE}\nreturn SpectrumSynthProcessor;`
      );

      const SynthClass = factory(BaseWorkletProcessorShim, registerProcessorShim, ctx.sampleRate, ctx.currentTime) || RegisteredClass;
      const synthInstance = new SynthClass();

      const quantumL = new Float32Array(128);
      const quantumR = new Float32Array(128);
      const outputs = [[quantumL, quantumR]];

      scriptNode.onaudioprocess = (audioEvent: AudioProcessingEvent) => {
        const outL = audioEvent.outputBuffer.getChannelData(0);
        const outR = audioEvent.outputBuffer.numberOfChannels > 1 ? audioEvent.outputBuffer.getChannelData(1) : outL;
        const total = outL.length;
        for (let offset = 0; offset < total; offset += 128) {
          const chunkLen = Math.min(128, total - offset);
          quantumL.fill(0);
          quantumR.fill(0);
          synthInstance.process([], outputs);
          for (let i = 0; i < chunkLen; i++) {
            outL[offset + i] = quantumL[i];
            if (outR !== outL) outR[offset + i] = quantumR[i];
          }
        }
      };

      this.fallbackProcessorNode = scriptNode;
      this.fallbackPort = {
        postMessage: (msg: unknown) => {
          if (processorMessageHandler) {
            processorMessageHandler({ data: msg });
          }
        },
        onmessage: null,
      };

      this.masterGainNode = ctx.createGain();
      this.masterGainNode.gain.setValueAtTime(0, ctx.currentTime);

      this.masterLimiterNode = ctx.createDynamicsCompressor();
      this.masterLimiterNode.threshold.setValueAtTime(-0.5, ctx.currentTime);
      this.masterLimiterNode.knee.setValueAtTime(0, ctx.currentTime);
      this.masterLimiterNode.ratio.setValueAtTime(20, ctx.currentTime);
      this.masterLimiterNode.attack.setValueAtTime(0.002, ctx.currentTime);
      this.masterLimiterNode.release.setValueAtTime(0.05, ctx.currentTime);

      scriptNode.connect(this.masterGainNode);
      this.masterGainNode.connect(this.masterLimiterNode);
      this.masterLimiterNode.connect(ctx.destination);
      return true;
    } catch (err) {
      console.warn('[AudioEngine] ScriptProcessor fallback failed:', err);
      return false;
    }
  }

  public async unlock(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      this.isMutedForFocus = false;
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) {
          this.isUnlocked = true;
          return true;
        }
        this.ctx = new AudioContextClass();
      }

      // CRITICAL FOR iOS SAFARI: Trigger silent buffer AND start resume() SYNCHRONOUSLY
      // in the exact user-gesture tick before any `await` yields the call stack!
      try {
        const silentBuffer = this.ctx.createBuffer(1, 1, 22050);
        const source = this.ctx.createBufferSource();
        source.buffer = silentBuffer;
        source.connect(this.ctx.destination);
        source.start(0);
      } catch {
        // Ignore silent buffer errors on mocks
      }

      const stateStr = this.ctx.state as string;
      const resumePromise =
        stateStr === 'suspended' || stateStr === 'interrupted'
          ? this.ctx.resume()
          : Promise.resolve();

      await resumePromise;

      if (!this.hasSynthNode()) {
        let workletLoaded = false;

        if (this.ctx.audioWorklet && typeof this.ctx.audioWorklet.addModule === 'function') {
          try {
            const blob = new Blob([SPECTRUM_WORKLET_CODE], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            await this.ctx.audioWorklet.addModule(url);
            setTimeout(() => URL.revokeObjectURL(url), 3000);
            workletLoaded = true;
          } catch {
            // Fallback to base64 data URI for strict WebKit CSP environments
            try {
              const b64 = typeof btoa === 'function' ? btoa(SPECTRUM_WORKLET_CODE) : '';
              if (b64) {
                await this.ctx.audioWorklet.addModule(`data:application/javascript;base64,${b64}`);
                workletLoaded = true;
              }
            } catch {
              workletLoaded = false;
            }
          }
        }

        if (workletLoaded) {
          this.workletNode = new AudioWorkletNode(this.ctx, 'spectrum-synth-processor', {
            outputChannelCount: [2],
          });
          this.workletNode.port.onmessage = this.handleTelemetryEvent;

          this.masterGainNode = this.ctx.createGain();
          this.masterGainNode.gain.setValueAtTime(0, this.ctx.currentTime);

          this.masterLimiterNode = this.ctx.createDynamicsCompressor();
          this.masterLimiterNode.threshold.setValueAtTime(-0.5, this.ctx.currentTime);
          this.masterLimiterNode.knee.setValueAtTime(0, this.ctx.currentTime);
          this.masterLimiterNode.ratio.setValueAtTime(20, this.ctx.currentTime);
          this.masterLimiterNode.attack.setValueAtTime(0.002, this.ctx.currentTime);
          this.masterLimiterNode.release.setValueAtTime(0.05, this.ctx.currentTime);

          this.workletNode.connect(this.masterGainNode);
          this.masterGainNode.connect(this.masterLimiterNode);
          this.masterLimiterNode.connect(this.ctx.destination);
        } else {
          // Automatic fallback for mobile HTTP LAN (where ctx.audioWorklet is undefined)
          this.initScriptProcessorFallback(this.ctx);
        }
      }

      // Ensure context didn't re-suspend while awaiting module compilation on iOS
      const postState = this.ctx.state as string;
      if (postState === 'suspended' || postState === 'interrupted') {
        await this.ctx.resume();
      }

      this.isUnlocked = true;
      this.applyMasterGain();
      this.syncSceneToWorklet();
      return true;
    } catch (e) {
      console.warn('[AudioEngine] Failed to unlock audio context, enabling visual playback fallback:', e);
      this.isUnlocked = true;
      return true;
    }
  }

  public async play(): Promise<boolean> {
    this.isMutedForFocus = false;
    this.playStartTime = performance.now();
    await this.unlock();
    this.isPlaying = true;
    this.applyMasterGain();
    this.syncSceneToWorklet();
    return true;
  }

  public pause(): void {
    this.isPlaying = false;
    this.isKeyDownLocal = false;
    this.isAuditioningLocal = false;
    this.applyMasterGain();
    this.syncSceneToWorklet();
    this.postToSynth({
      type: 'STOP_ALL',
    });
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Returns current note age in seconds for a shape, enabling visualisations
   * to accurately render dynamic harmonic damping and ADSR levels.
   * Returns 0 when audio is paused and not auditioning so levels do not fluctuate while idle.
   */
  public getNoteAge(shapeId?: string): number {
    if (!this.isAudioActive()) return 0;
    const id = shapeId || this.scene.placements[0]?.shapeId;
    if (!id || !this.latestTelemetry?.phases?.[id]) {
      return Math.max(0, (performance.now() - this.playStartTime) / 1000);
    }
    const baseAge = (this.latestTelemetry.phases[id] as { noteAge?: number }).noteAge || 0;
    const elapsedSec = (performance.now() - this.latestTelemetryTime) / 1000;
    return baseAge + Math.max(0, elapsedSec);
  }

  /**
   * Note On: triggered when user presses down key T or presses Strike Note.
   * Starts note attack in pitch space (sustaining while held), or starts/loops rhythm cycles.
   */
  public async noteOn(shapeId?: string, sceneOverride?: Scene): Promise<void> {
    if (sceneOverride) {
      this.scene = sceneOverride;
    }
    this.isMutedForFocus = false;
    this.isKeyDownLocal = true;
    this.isAuditioningLocal = true;
    const ok = await this.unlock();
    if (!ok || !this.hasSynthNode()) return;
    this.applyMasterGain();
    this.syncSceneToWorklet();

    this.postToSynth({
      type: 'NOTE_ON',
      payload: { shapeId },
    });
  }

  /**
   * Note Off: triggered when user releases key T.
   * Triggers release fade-out in pitch space (allowing crisp staccato on rapid taps),
   * or lets the active rhythm cycle finish completely to its boundary.
   */
  public noteOff(shapeId?: string): void {
    this.isKeyDownLocal = false;
    if (!this.hasSynthNode()) return;
    this.postToSynth({
      type: 'NOTE_OFF',
      payload: { shapeId },
    });
  }

  /**
   * Triggers an acoustic note envelope strike.
   */
  public async triggerNote(shapeId?: string, sceneOverride?: Scene): Promise<void> {
    if (sceneOverride) {
      this.scene = sceneOverride;
    }
    this.isMutedForFocus = false;
    this.isKeyDownLocal = false;
    this.isAuditioningLocal = true;
    const ok = await this.unlock();
    if (!ok || !this.hasSynthNode()) return;
    this.applyMasterGain();
    this.syncSceneToWorklet();

    this.postToSynth({
      type: 'TRIGGER_NOTE',
      payload: { shapeId },
    });
  }

  private applyMasterGain(): void {
    if (this.masterGainNode && this.ctx) {
      // Audio graph output is unmuted whenever audio context is active and not focus-muted.
      // The worklet processor controls audio emission (continuous transport vs key-triggered audition).
      const targetGain = !this.isMutedForFocus ? this.scene.audio.masterGain : 0;
      this.masterGainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.02);
    }
  }

  public updateScene(scene: Scene): void {
    this.scene = scene;
    this.applyMasterGain();
    this.syncSceneToWorklet();
  }

  private syncSceneToWorklet(): void {
    if (!this.hasSynthNode()) return;

    const payloadShapes = buildAudioPayloadShapes(this.scene);
    const effectiveGain = !this.isMutedForFocus ? this.scene.audio.masterGain : 0;

    this.postToSynth({
      type: 'UPDATE_SCENE',
      payload: {
        shapes: payloadShapes,
        audioMode: this.scene.audio.audioMode,
        masterGain: effectiveGain,
        isPlaying: this.isPlaying,
        tplHz: this.scene.anchors.tplFrequencyHz,
        filter: compileFilterForWorklet(this.scene.filter),
      },
    });
  }

  private handleFocusChange(focused: boolean): void {
    if (!this.scene.cosmetics.focusModeEnabled) {
      this.isMutedForFocus = false;
      this.applyMasterGain();
      this.syncSceneToWorklet();
      return;
    }
    // Only mute when document is genuinely hidden in background
    const isActuallyHidden = typeof document !== 'undefined' && document.hidden;
    this.isMutedForFocus = !focused && isActuallyHidden;
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
    const shapeData = this.latestTelemetry?.phases?.[shapeId];
    const isAuditioning = Boolean(shapeData?.isAuditioning || this.isAuditioningLocal);
    if (!this.isUnlocked || (!this.isPlaying && !isAuditioning) || this.isMutedForFocus || this.scene.audio.masterGain <= 0.0001) {
      return 0.0;
    }
    if (!shapeData) {
      // Smooth local fallback phase before first telemetry tick or when running without worklet telemetry
      const pl = this.scene.placements.find((p) => p.shapeId === shapeId) || this.scene.placements[0];
      const d = pl ? pl.d : 0;
      const f0 = this.scene.anchors.tplFrequencyHz * Math.pow(2, -d);
      const elapsedSec = Math.max(0, (performance.now() - this.playStartTime) / 1000.0);
      return elapsedSec * f0;
    }

    const dt = (performance.now() - this.latestTelemetryTime) / 1000.0;
    return shapeData.masterPhase + shapeData.f0 * dt;
  }

  public isAudioActive(): boolean {
    const hasAuditioning = Boolean(
      this.latestTelemetry?.phases &&
      Object.values(this.latestTelemetry.phases).some((p) => p.isAuditioning)
    );
    const activeAuditioning = this.isAuditioningLocal || hasAuditioning;
    return (
      this.isUnlocked &&
      (this.isPlaying || activeAuditioning) &&
      !this.isMutedForFocus &&
      this.scene.audio.masterGain > 0.0001
    );
  }

  public isReady(): boolean {
    return this.isUnlocked && this.ctx !== null && this.ctx.state === 'running';
  }

  public destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', this.onFocus);
      window.removeEventListener('blur', this.onBlur);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
      }
      delete (window as unknown as { __PPT_AUDIO_ENGINE__?: AudioEngine }).__PPT_AUDIO_ENGINE__;
    }
    if (this.fallbackProcessorNode) {
      this.fallbackProcessorNode.disconnect();
      this.fallbackProcessorNode.onaudioprocess = null;
      this.fallbackProcessorNode = null;
      this.fallbackPort = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
      this.workletNode = null;
      this.masterGainNode = null;
      this.masterLimiterNode = null;
      this.isUnlocked = false;
    }
    if (AudioEngine.instance === this) {
      AudioEngine.instance = null;
    }
  }
}
