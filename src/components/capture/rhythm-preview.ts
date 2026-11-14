import { Shape, VoiceId } from '../../core/types';
import { ratioToValue } from '../../core/rational';

function triggerPreviewVoice(ctx: AudioContext, time: number, voice: VoiceId, gainVal: number): void {
  const amp = Math.max(0.05, Math.min(0.6, gainVal * 0.4));

  if (voice === 'kick') {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(48, time + 0.09);
    g.gain.setValueAtTime(amp, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
    osc.connect(g).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.15);
    return;
  }

  if (voice === 'snare' || voice === 'hihat') {
    const len = voice === 'hihat' ? 0.045 : 0.1;
    const bufferSize = Math.floor(ctx.sampleRate * len);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp((-i / bufferSize) * 4);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = voice === 'hihat' ? 'highpass' : 'bandpass';
    filter.frequency.setValueAtTime(voice === 'hihat' ? 5500 : 1800, time);

    const g = ctx.createGain();
    g.gain.setValueAtTime(amp * (voice === 'hihat' ? 0.55 : 0.8), time);
    g.gain.exponentialRampToValueAtTime(0.001, time + len);

    noise.connect(filter).connect(g).connect(ctx.destination);
    noise.start(time);
    return;
  }

  // Clave / woodblock / triangle / click
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = voice === 'triangle' ? 'triangle' : 'sine';
  const freq = voice === 'clave' || voice === 'woodblock' ? 1150 : voice === 'triangle' ? 2200 : 880;
  osc.frequency.setValueAtTime(freq, time);
  g.gain.setValueAtTime(amp * 0.75, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.065);
  osc.connect(g).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.075);
}

interface PreviewEvent {
  offsetSec: number;
  voice: VoiceId;
  gain: number;
}

function buildCycleEvents(shape: Shape, cyclePeriodSec: number): PreviewEvent[] {
  const events: PreviewEvent[] = [];
  const anchors = shape.anchors ?? [];

  for (const anchor of anchors) {
    if (anchor.mute || anchor.gain <= 0) continue;
    const anchorRatio = ratioToValue(anchor.ratio);

    for (const p of anchor.partials) {
      const r = Math.max(0.25, anchorRatio * ratioToValue(p.ratio));
      const period = cyclePeriodSec / r;
      const phase = (((anchor.phaseOffset || 0) + (p.phase || 0)) % 1 + 1) % 1;
      const firstOffset = phase * period;
      const voice = p.voice || anchor.voice || 'clave';
      const gain = anchor.gain * p.amp;

      for (let t = firstOffset; t < cyclePeriodSec - 0.005; t += period) {
        events.push({ offsetSec: t, voice, gain });
      }
    }
  }

  return events.sort((a, b) => a.offsetSec - b.offsetSec);
}

export interface RhythmPreviewHandle {
  stop: () => void;
  /** Continuous unwrapped cycle turns synchronised with AudioContext.currentTime. */
  getPhase: () => number;
}

/**
 * Starts a looping Web Audio preview of a captured rhythm Shape.
 * Returns a handle with `stop()` and `getPhase()` for synchronised visual animation.
 */
export function startRhythmPreview(shape: Shape, cyclePeriodSec: number): RhythmPreviewHandle {
  const ctx = new AudioContext();
  const safePeriod = Math.max(0.3, cyclePeriodSec);
  const events = buildCycleEvents(shape, safePeriod);

  const startTime = ctx.currentTime + 0.05;
  let nextCycleStart = startTime;
  let stopped = false;

  const schedule = () => {
    if (stopped) return;
    const horizon = ctx.currentTime + 0.25;
    while (nextCycleStart < horizon) {
      for (const ev of events) {
        triggerPreviewVoice(ctx, nextCycleStart + ev.offsetSec, ev.voice, ev.gain);
      }
      nextCycleStart += safePeriod;
    }
  };

  schedule();
  const timerId = window.setInterval(schedule, 60);

  return {
    stop: () => {
      stopped = true;
      window.clearInterval(timerId);
      ctx.close().catch(() => {});
    },
    getPhase: () => {
      if (stopped) return 0;
      return Math.max(0, (ctx.currentTime - startTime) / safePeriod);
    },
  };
}
