import React, { useState, useRef, useEffect } from 'react';
import { Shape, VoiceId } from '../core/types';
import {
  decomposeTapIntervals,
  decomposeMultiVoiceOnsets,
  RhythmDecompositionCandidate,
  CapturedOnsetEvent,
} from '../core/decompose';
import { flattenAnchorsToPartials } from '../core/shape';
import { freqToPitchRegister } from '../core/axis';
import { detectHarmonicSpectrum, classifyMicOnsetVoice } from '../audio/pitch-capture';
import { X, Mic, Radio, Hand, Sparkles, RotateCcw, Drum } from 'lucide-react';

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureShape: (shape: Shape, dPosition: number) => void;
  tplHz: number;
}

const DRUM_PADS: { voice: VoiceId; label: string; keyHint: string; sub: string; colorClass: string }[] = [
  {
    voice: 'kick',
    label: 'Kick',
    keyHint: '1',
    sub: 'Low Sub / Downbeat',
    colorClass: 'border-red-500/50 bg-red-600/20 hover:border-red-400 text-red-200',
  },
  {
    voice: 'snare',
    label: 'Snare',
    keyHint: '2',
    sub: 'Backbeat / Mid Snap',
    colorClass: 'border-amber-500/50 bg-amber-600/20 hover:border-amber-400 text-amber-200',
  },
  {
    voice: 'clave',
    label: 'Clave',
    keyHint: '3',
    sub: 'Woody Syncopation',
    colorClass: 'border-emerald-500/50 bg-emerald-600/20 hover:border-emerald-400 text-emerald-200',
  },
  {
    voice: 'hihat',
    label: 'Hi-Hat',
    keyHint: '4',
    sub: 'High Metallic Tick',
    colorClass: 'border-cyan-500/50 bg-cyan-600/20 hover:border-cyan-400 text-cyan-200',
  },
];

export const CaptureModal: React.FC<CaptureModalProps> = ({
  isOpen,
  onClose,
  onCaptureShape,
  tplHz,
}) => {
  const [activeTab, setActiveTab] = useState<'tap' | 'mic'>('tap');
  const [onsetEvents, setOnsetEvents] = useState<CapturedOnsetEvent[]>([]);
  const [candidates, setCandidates] = useState<RhythmDecompositionCandidate[]>([]);

  // Mic capture state (used in both Rhythm Onset Mic mode and Pitch Spectrum mode)
  const [isListening, setIsListening] = useState(false);
  const [isRhythmMicListening, setIsRhythmMicListening] = useState(false);
  const [detectedPitch, setDetectedPitch] = useState<number>(0);
  const [harmonicAmps, setHarmonicAmps] = useState<number[]>([1, 0.5, 0.33, 0.25, 0.2, 0.16, 0.14, 0.12]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const micAnimRef = useRef<number | null>(null);
  const lastOnsetTimeRef = useRef<number>(0);
  const prevRmsRef = useRef<number>(0);

  const stopAllMicCapture = () => {
    if (micAnimRef.current) {
      cancelAnimationFrame(micAnimRef.current);
      micAnimRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsListening(false);
    setIsRhythmMicListening(false);
  };

  const recordOnset = (voice: VoiceId, velocity: number = 0.9) => {
    const now = performance.now() / 1000;
    setOnsetEvents((prev) => {
      // Reset if pause > 4.5s since last tap
      const base = prev.length > 0 && now - prev[prev.length - 1].timestampSec > 4.5 ? [] : prev;
      const next = [...base, { timestampSec: now, voice, velocity }].slice(-12);
      const inferred = decomposeTapIntervals(next.map((e) => e.timestampSec));
      setCandidates(inferred);
      return next;
    });
  };

  useEffect(() => {
    if (!isOpen || activeTab !== 'tap') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1') { e.preventDefault(); recordOnset('kick', 1.0); }
      else if (e.key === '2') { e.preventDefault(); recordOnset('snare', 0.9); }
      else if (e.key === '3') { e.preventDefault(); recordOnset('clave', 0.85); }
      else if (e.key === '4') { e.preventDefault(); recordOnset('hihat', 0.75); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const multiVoiceDecomp = decomposeMultiVoiceOnsets(onsetEvents);

  const handleApplyMultiVoiceGroove = () => {
    if (multiVoiceDecomp.anchors.length === 0) return;
    const f0 = 1 / multiVoiceDecomp.cyclePeriodSec;
    const d = Math.log2(tplHz / f0);
    const anchors = multiVoiceDecomp.anchors;

    const capturedShape: Shape = {
      id: `captured-groove-${Date.now()}`,
      name: `Captured Groove (${multiVoiceDecomp.bpm} BPM)`,
      origin: 'captured-rhythm',
      category: 'rhythm',
      description: `Multi-voice rhythm captured with ${anchors.length} DuMetric Voice Anchors (${anchors
        .map((a) => a.offsetToken)
        .join(', ')}).`,
      anchors,
      partials: flattenAnchorsToPartials(anchors),
    };

    onCaptureShape(capturedShape, d);
    stopAllMicCapture();
    onClose();
  };

  const handleApplyTapCandidate = (cand: RhythmDecompositionCandidate) => {
    const primaryPeriod = cand.cyclePeriodSec;
    const f0 = 1 / primaryPeriod;
    const d = Math.log2(tplHz / f0);

    const capturedShape: Shape = {
      id: `captured-tap-${Date.now()}`,
      name: `Tap: ${cand.name}`,
      origin: 'captured-rhythm',
      category: 'rhythm',
      description: `Rhythm shape captured from live tap stream at ${(primaryPeriod * 1000).toFixed(0)} ms cycle.`,
      partials: cand.ratios.map((r, i) => ({
        id: `p_tap_${i + 1}`,
        ratio: { kind: 'rational', num: r, den: 1 },
        amp: 1.0 - i * 0.15,
        phase: 0,
        voice: i === 0 ? 'kick' : i === 1 ? 'snare' : 'woodblock',
        label: `${r}`,
      })),
    };

    onCaptureShape(capturedShape, d);
    stopAllMicCapture();
    onClose();
  };

  const acquireAudioStream = async (): Promise<MediaStream> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        throw new Error('Microphone access requires a secure context (HTTPS or localhost).');
      }
      throw new Error('Microphone input is not supported in this browser environment.');
    }

    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
    } catch {
      // Fallback for browser audio drivers that reject custom raw constraints
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    }
  };

  const startRhythmMicCapture = async () => {
    try {
      stopAllMicCapture();
      const stream = await acquireAudioStream();
      streamRef.current = stream;
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsRhythmMicListening(true);
      const timeBuffer = new Float32Array(analyser.fftSize);
      const freqBuffer = new Float32Array(analyser.frequencyBinCount);
      prevRmsRef.current = 0;

      const poll = () => {
        analyser.getFloatTimeDomainData(timeBuffer);
        analyser.getFloatFrequencyData(freqBuffer);
        const { rms, voice } = classifyMicOnsetVoice(timeBuffer, freqBuffer, ctx.sampleRate, analyser.fftSize);
        const now = performance.now() / 1000;

        // Detect sharp rising transient above noise threshold with 110ms debounce
        if (rms > 0.045 && rms > prevRmsRef.current * 1.65 && now - lastOnsetTimeRef.current > 0.11) {
          lastOnsetTimeRef.current = now;
          const vel = Math.max(0.35, Math.min(1.0, rms * 4.5));
          recordOnset(voice, vel);
        }
        prevRmsRef.current = rms * 0.7 + prevRmsRef.current * 0.3;
        micAnimRef.current = requestAnimationFrame(poll);
      };
      micAnimRef.current = requestAnimationFrame(poll);
    } catch (e) {
      console.warn('[RhythmMicCapture] Failed to access microphone:', e);
      const msg = e instanceof Error ? e.message : 'Could not access microphone.';
      alert(`${msg} Please ensure microphone permission is granted in browser settings.`);
    }
  };

  const startMicCapture = async () => {
    try {
      stopAllMicCapture();
      const stream = await acquireAudioStream();
      streamRef.current = stream;
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);
      const timeBuffer = new Float32Array(analyser.fftSize);
      const freqBuffer = new Float32Array(analyser.frequencyBinCount);

      const poll = () => {
        analyser.getFloatTimeDomainData(timeBuffer);
        analyser.getFloatFrequencyData(freqBuffer);
        const { freqHz, confidence, harmonicAmps: amps } = detectHarmonicSpectrum(
          timeBuffer,
          freqBuffer,
          ctx.sampleRate,
          analyser.fftSize,
          8
        );
        if (confidence > 0.72 && freqHz > 45) {
          setDetectedPitch(freqHz);
          if (amps.length > 0) {
            setHarmonicAmps(amps);
          }
        }
        micAnimRef.current = requestAnimationFrame(poll);
      };
      micAnimRef.current = requestAnimationFrame(poll);
    } catch (e) {
      console.warn('[MicCapture] Failed to access microphone:', e);
      const msg = e instanceof Error ? e.message : 'Could not access microphone.';
      alert(`${msg} Please ensure microphone permission is granted in browser settings.`);
    }
  };

  const handleApplyMicPitch = () => {
    if (detectedPitch <= 0) return;
    const d = Math.log2(tplHz / detectedPitch);
    const pitchReg = freqToPitchRegister(detectedPitch, 440);

    const capturedShape: Shape = {
      id: `captured-pitch-${Date.now()}`,
      name: `Mic: ${pitchReg.note}${pitchReg.octave} (${detectedPitch.toFixed(1)} Hz)`,
      origin: 'captured-pitch',
      category: 'timbre',
      description: `Harmonic partial spectrum captured from microphone at ${detectedPitch.toFixed(1)} Hz (${pitchReg.formatted}).`,
      partials: harmonicAmps.map((amp, idx) => {
        const k = idx + 1;
        return {
          id: `p_mic_${k}`,
          ratio: { kind: 'rational', num: k, den: 1 },
          amp: Number(Math.max(0.02, Math.min(1.0, amp)).toFixed(3)),
          previousAmp: Number(Math.max(0.02, Math.min(1.0, amp)).toFixed(3)),
          phase: 0,
          voice: k === 1 ? 'kick' : k === 2 ? 'snare' : k <= 4 ? 'woodblock' : 'triangle',
          label: `${k}x`,
        };
      }),
    };

    onCaptureShape(capturedShape, d);
    stopAllMicCapture();
    onClose();
  };

  const detectedPitchNote = detectedPitch > 0 ? freqToPitchRegister(detectedPitch, 440) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-[#0c101a] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-red-500" />
            <h2 className="text-sm font-bold tracking-wide text-white uppercase">
              Capture Multi-Voice Rhythm &amp; Harmonic Spectrum
            </h2>
          </div>
          <button
            onClick={() => {
              stopAllMicCapture();
              onClose();
            }}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="my-4 flex gap-2">
          <button
            onClick={() => {
              stopAllMicCapture();
              setActiveTab('tap');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold transition ${
              activeTab === 'tap'
                ? 'border-red-500 bg-red-600/25 text-white'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Drum className="h-4 w-4" />
            <span>Multi-Voice Rhythm &amp; Onsets</span>
          </button>
          <button
            onClick={() => {
              stopAllMicCapture();
              setActiveTab('mic');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold transition ${
              activeTab === 'mic'
                ? 'border-purple-500 bg-purple-600/25 text-white'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="h-4 w-4" />
            <span>Mic Pitch &amp; Harmonic Spectrum</span>
          </button>
        </div>

        {/* RHYTHM MULTI-VOICE PADS & ONSET DETECTOR */}
        {activeTab === 'tap' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Tap Drum Pads (keys 1–4) or enable Mic Onsets to classify beatbox/taps into DuMetric Voice Anchors:</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => (isRhythmMicListening ? stopAllMicCapture() : startRhythmMicCapture())}
                  className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-bold transition cursor-pointer ${
                    isRhythmMicListening
                      ? 'border-red-500 bg-red-600/30 text-red-200 animate-pulse'
                      : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white'
                  }`}
                >
                  <Mic className="h-3 w-3" />
                  <span>{isRhythmMicListening ? 'Mic Onsets Active' : 'Mic Onset Detect'}</span>
                </button>
                {onsetEvents.length > 0 && (
                  <button
                    onClick={() => {
                      setOnsetEvents([]);
                      setCandidates([]);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded border border-slate-700 bg-slate-800/80 text-[10px] text-slate-300 hover:text-white transition cursor-pointer"
                    title="Clear captured hits"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {/* 4 Multi-Voice Drum Pads */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DRUM_PADS.map((pad) => (
                <button
                  key={pad.voice}
                  onClick={() => recordOnset(pad.voice, pad.voice === 'kick' ? 1.0 : 0.85)}
                  className={`h-24 rounded-xl border p-2.5 flex flex-col items-center justify-center gap-1 active:scale-95 transition cursor-pointer select-none ${pad.colorClass}`}
                >
                  <div className="flex items-center gap-1.5">
                    <Hand className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">{pad.label}</span>
                    <kbd className="rounded bg-black/40 px-1.5 py-0.5 text-[9px] font-mono">{pad.keyHint}</kbd>
                  </div>
                  <span className="text-[9px] opacity-75 text-center">{pad.sub}</span>
                </button>
              ))}
            </div>

            {/* Captured DuMetric Voice Anchors Preview */}
            {multiVoiceDecomp.anchors.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-200">
                    Quantised DuMetric Voice Anchors ({multiVoiceDecomp.anchors.length} voices • ~{multiVoiceDecomp.bpm} BPM)
                  </span>
                  <button
                    onClick={handleApplyMultiVoiceGroove}
                    className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-[11px] font-bold text-white shadow-[0_0_12px_rgba(238,54,16,0.3)] transition cursor-pointer"
                  >
                    Apply Multi-Voice Groove
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {multiVoiceDecomp.anchors.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-700/80 bg-slate-950/80 px-2 py-1 text-[10px] font-mono text-slate-200"
                    >
                      <span className="font-bold text-amber-400">{a.offsetToken}</span>
                      <span className="text-slate-400">({a.voice})</span>
                      <span className="text-slate-500">{Math.round(a.gain * 100)}%</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Inferred Polyrhythmic Candidates */}
            {candidates.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Or Apply Standard Polyrhythmic Grid:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {candidates.map((cand, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleApplyTapCandidate(cand)}
                      className="p-2 rounded-lg border border-slate-800 bg-slate-900/70 hover:border-red-500/60 text-left transition cursor-pointer"
                    >
                      <div className="text-xs font-bold text-white">{cand.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Cycle: {(cand.cyclePeriodSec * 1000).toFixed(0)} ms ({Math.round(60 / cand.cyclePeriodSec)} BPM)
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MIC PITCH & HARMONIC SPECTRUM MODE */}
        {activeTab === 'mic' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Radio className={`h-6 w-6 ${isListening ? 'text-purple-400 animate-pulse' : 'text-slate-600'}`} />
                  <div>
                    <div className="text-lg font-bold font-mono text-white">
                      {detectedPitch > 0
                        ? `${detectedPitch.toFixed(1)} Hz (${detectedPitchNote?.formatted})`
                        : '--- Hz'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {isListening
                        ? 'Decomposing fundamental f0 + 8 harmonic overtone partials in real time'
                        : 'Click Start Microphone and sing or play an instrument'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Live 8-Harmonic Spectrum Bar Meter */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">
                  Captured Harmonic Partial Profile (1x – 8x Overtones)
                </div>
                <div className="grid grid-cols-8 gap-2 items-end h-24 pt-2 px-2 rounded-lg bg-slate-950/70 border border-slate-800/60">
                  {harmonicAmps.map((amp, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1 h-full justify-end">
                      <div className="text-[9px] font-mono text-slate-400">{Math.round(amp * 100)}%</div>
                      <div className="w-full bg-slate-800/60 rounded-t h-14 flex items-end overflow-hidden">
                        <div
                          className="w-full bg-gradient-to-t from-purple-600 to-cyan-400 rounded-t transition-all duration-75"
                          style={{ height: `${Math.max(6, Math.round(amp * 100))}%` }}
                        />
                      </div>
                      <div className="text-[9px] font-mono font-bold text-slate-300">{idx + 1}x</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {!isListening ? (
                <button
                  onClick={startMicCapture}
                  className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 font-bold text-xs text-white transition cursor-pointer"
                >
                  Start Microphone
                </button>
              ) : (
                <button
                  onClick={stopAllMicCapture}
                  className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 font-bold text-xs text-slate-200 transition cursor-pointer"
                >
                  Stop Listening
                </button>
              )}

              <button
                disabled={detectedPitch <= 0}
                onClick={handleApplyMicPitch}
                className={`flex-1 py-2 rounded-lg font-bold text-xs text-white transition ${
                  detectedPitch > 0
                    ? 'bg-red-600 hover:bg-red-500 cursor-pointer shadow-[0_0_12px_rgba(238,54,16,0.3)]'
                    : 'bg-slate-800 opacity-40 cursor-not-allowed'
                }`}
              >
                Apply Captured Spectrum to Scene
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
