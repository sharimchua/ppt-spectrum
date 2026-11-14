import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PartialComponent, Ratio, Shape, VoiceAnchor } from '../../core/types';
import { freqToPitchRegister } from '../../core/axis';
import { formatRatioShort } from '../../core/ratio-suggestions';
import {
  computeBufferRms,
  detectSpectralPartials,
  CapturedPartialPeak,
} from '../../audio/pitch-capture';
import { acquireCaptureAudioStream } from './capture-audio';
import { ShapeRulerPreview } from '../shape-editor/ShapeRulerPreview';
import { RatioScrubber } from '../shape-editor/RatioScrubber';
import { Radio, RotateCcw, Sparkles } from 'lucide-react';

export interface PitchCaptureTabProps {
  tplHz: number;
  onCaptureShape: (shape: Shape, dPosition: number) => void;
  onClose: () => void;
  registerStopHook: (stopFn: () => void) => void;
}

type CaptureStage = 'idle' | 'armed' | 'capturing' | 'locked';
type SpectrumMode = 'harmonic' | 'inharmonic';

const DEFAULT_PREVIEW_PARTIALS: PartialComponent[] = [1, 2, 3, 4, 5, 6, 7, 8].map((k) => ({
  id: `p_preview_${k}`,
  ratio: { kind: 'rational', num: k, den: 1 },
  amp: Number((1 / k).toFixed(3)),
  previousAmp: Number((1 / k).toFixed(3)),
  phase: 0,
  voice: k === 1 ? 'kick' : k === 2 ? 'snare' : k <= 4 ? 'woodblock' : 'triangle',
  label: `${k}x`,
}));

function buildCapturedPartials(peaks: CapturedPartialPeak[]): PartialComponent[] {
  return peaks.map((peak, idx) => {
    const ratio: Ratio = peak.isHarmonic
      ? { kind: 'rational', num: Math.round(peak.ratio), den: 1 }
      : { kind: 'real', value: Number(peak.ratio.toFixed(4)) };
    return {
      id: `p_mic_${idx + 1}`,
      ratio,
      amp: Number(Math.max(0.02, Math.min(1.0, peak.amp)).toFixed(3)),
      previousAmp: Number(Math.max(0.02, Math.min(1.0, peak.amp)).toFixed(3)),
      phase: 0,
      voice: idx === 0 ? 'kick' : idx === 1 ? 'snare' : idx < 4 ? 'woodblock' : 'triangle',
      label: formatRatioShort(ratio),
    };
  });
}

export const PitchCaptureTab: React.FC<PitchCaptureTabProps> = ({
  tplHz,
  onCaptureShape,
  onClose,
  registerStopHook,
}) => {
  const [stage, setStage] = useState<CaptureStage>('idle');
  const [spectrumMode, setSpectrumMode] = useState<SpectrumMode>('harmonic');
  const [detectedPitch, setDetectedPitch] = useState<number>(0);
  const [inputLevel, setInputLevel] = useState<number>(0);
  const [sensitivity, setSensitivity] = useState<number>(7);
  const [partials, setPartials] = useState<PartialComponent[]>(DEFAULT_PREVIEW_PARTIALS);
  const [selectedPartialIdx, setSelectedPartialIdx] = useState<number>(0);

  const sensitivityRef = useRef<number>(7);
  sensitivityRef.current = sensitivity;
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number | null>(null);

  const stopMic = () => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setInputLevel(0);
  };

  useEffect(() => {
    registerStopHook(() => {
      stopMic();
      setStage((prev) => (prev === 'locked' ? 'locked' : 'idle'));
    });
    return () => stopMic();
  }, [registerStopHook]);

  const startArmedCapture = async () => {
    try {
      stopMic();
      const stream = await acquireCaptureAudioStream();
      streamRef.current = stream;
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      source.connect(analyser);

      setStage('armed');
      const timeBuffer = new Float32Array(analyser.fftSize);
      const freqBuffer = new Float32Array(analyser.frequencyBinCount);

      let ambientSamples = 0;
      let ambientSum = 0;
      let ambientRms = 0.004;
      let localStage: CaptureStage = 'armed';
      let attackStartMs = 0;
      let peakRms = 0;
      let bestFrame: { freqHz: number; partials: CapturedPartialPeak[] } | null = null;

      const poll = () => {
        analyser.getFloatTimeDomainData(timeBuffer);
        analyser.getFloatFrequencyData(freqBuffer);
        const rms = computeBufferRms(timeBuffer);
        setInputLevel(Math.min(1, rms * 14));

        // Map sensitivity (1..10) to trigger threshold: default 7 -> minRms ~0.004, multiplier ~1.9x
        const sens = sensitivityRef.current;
        const minRms = 0.016 - (sens - 1) * 0.0015;
        const mult = 2.6 - (sens - 1) * 0.1;
        const noiseFloor = Math.max(minRms, Math.min(0.05, ambientRms * mult));

        if (localStage === 'armed') {
          if (ambientSamples < 12) {
            ambientSum += rms;
            ambientSamples++;
            ambientRms = ambientSum / ambientSamples;
          } else if (rms > noiseFloor) {
            localStage = 'capturing';
            setStage('capturing');
            attackStartMs = performance.now();
            peakRms = rms;
            bestFrame = null;
          } else {
            // Slowly adapt ambient floor while idle
            ambientRms = ambientRms * 0.96 + rms * 0.04;
          }
        }

        if (localStage === 'capturing') {
          const elapsed = performance.now() - attackStartMs;
          const res = detectSpectralPartials(
            timeBuffer,
            freqBuffer,
            ctx.sampleRate,
            analyser.fftSize,
            24,
            spectrumMode
          );

          if (res.confidence >= 0.58 && res.freqHz > 45 && res.partials.length > 0) {
            if (!bestFrame || rms >= peakRms * 0.9) {
              peakRms = Math.max(peakRms, rms);
              bestFrame = { freqHz: res.freqHz, partials: res.partials };
            }
          } else if (rms > peakRms) {
            peakRms = rms;
          }

          const attackFinished = elapsed >= 170 || (bestFrame !== null && elapsed >= 65 && rms < peakRms * 0.55);
          if (attackFinished) {
            if (bestFrame) {
              setDetectedPitch(bestFrame.freqHz);
              setPartials(buildCapturedPartials(bestFrame.partials));
              setSelectedPartialIdx(0);
              setStage('locked');
              stopMic();
              return;
            }
            // Unpitched transient; re-arm automatically
            localStage = 'armed';
            setStage('armed');
          }
        }

        animRef.current = requestAnimationFrame(poll);
      };

      animRef.current = requestAnimationFrame(poll);
    } catch (e) {
      console.warn('[PitchCapture] Failed to access microphone:', e);
      const msg = e instanceof Error ? e.message : 'Could not access microphone.';
      alert(`${msg} Please ensure microphone permission is granted in browser settings.`);
      setStage('idle');
    }
  };

  const previewAnchors: VoiceAnchor[] = useMemo(
    () => [
      {
        id: 'captured_pitch_root',
        name: 'Captured Spectrum',
        ratio: { kind: 'rational', num: 1, den: 1 },
        phaseOffset: 0,
        offsetToken: 'Do',
        gain: 1,
        voice: 'kick',
        mute: false,
        partials,
      },
    ],
    [partials]
  );

  const selectedPartial = partials[selectedPartialIdx] ?? partials[0];

  const handlePartialRatioChange = (nextRatio: Ratio) => {
    setPartials((prev) =>
      prev.map((p, idx) =>
        idx === selectedPartialIdx
          ? { ...p, ratio: nextRatio, label: formatRatioShort(nextRatio) }
          : p
      )
    );
  };

  const handleApply = () => {
    if (detectedPitch <= 0 || partials.length === 0) return;
    const d = Math.log2(tplHz / detectedPitch);
    const pitchReg = freqToPitchRegister(detectedPitch, 440);

    const capturedShape: Shape = {
      id: `captured-pitch-${Date.now()}`,
      name: `Mic: ${pitchReg.note}${pitchReg.octave} (${detectedPitch.toFixed(1)} Hz)`,
      origin: 'captured-pitch',
      category: 'timbre',
      description: `${partials.length}-partial ${spectrumMode} spectrum captured at peak attack (${detectedPitch.toFixed(1)} Hz, ${pitchReg.formatted}).`,
      partials,
    };

    onCaptureShape(capturedShape, d);
    stopMic();
    onClose();
  };

  const detectedPitchNote = detectedPitch > 0 ? freqToPitchRegister(detectedPitch, 440) : null;

  return (
    <div className="space-y-4">
      {/* Mode Selector + Status Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Radio
              className={`h-5 w-5 ${
                stage === 'armed'
                  ? 'text-amber-400 animate-pulse'
                  : stage === 'capturing'
                    ? 'text-purple-400 animate-ping'
                    : stage === 'locked'
                      ? 'text-emerald-400'
                      : 'text-slate-600'
              }`}
            />
            <div>
              <div className="text-base font-bold font-mono text-white">
                {detectedPitch > 0
                  ? `${detectedPitch.toFixed(1)} Hz (${detectedPitchNote?.formatted})`
                  : stage === 'armed'
                    ? 'Armed — Play a note...'
                    : stage === 'capturing'
                      ? 'Capturing peak attack...'
                      : '--- Hz'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {stage === 'locked'
                  ? `Locked ${partials.length} partials at attack peak. Tap any stem below to inspect or snap.`
                  : 'Arms mic and automatically locks timbre at the height of the note attack.'}
              </div>
            </div>
          </div>

          <div className="flex rounded-lg border border-slate-800 bg-slate-950/70 p-0.5 text-[10px] font-semibold">
            <button
              type="button"
              onClick={() => setSpectrumMode('harmonic')}
              disabled={stage === 'armed' || stage === 'capturing'}
              className={`px-2 py-1 rounded-md transition cursor-pointer ${
                spectrumMode === 'harmonic'
                  ? 'bg-purple-600/30 text-purple-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Harmonic (24x)
            </button>
            <button
              type="button"
              onClick={() => setSpectrumMode('inharmonic')}
              disabled={stage === 'armed' || stage === 'capturing'}
              className={`px-2 py-1 rounded-md transition cursor-pointer ${
                spectrumMode === 'inharmonic'
                  ? 'bg-cyan-600/30 text-cyan-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Spectral Peaks
            </button>
          </div>
        </div>

        {/* Sensitivity & Live Input Level Bar */}
        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
          <label className="flex items-center gap-1.5 shrink-0">
            <span>Sensitivity</span>
            <input
              type="range"
              min={1}
              max={10}
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              className="w-20 accent-purple-500 cursor-pointer"
            />
            <span className="text-slate-300 w-3">{sensitivity}</span>
          </label>
          <div className="relative h-2 flex-1 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-75"
              style={{ width: `${Math.round(inputLevel * 100)}%` }}
            />
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-amber-400/80"
              style={{ left: `${Math.round(Math.min(95, (0.016 - (sensitivity - 1) * 0.0015) * 14 * 100))}%` }}
              title="Trigger threshold"
            />
          </div>
        </div>

        {/* Shape Spectrum Preview (Ruler-style DuMetric Octave Axis) */}
        <ShapeRulerPreview
          anchors={previewAnchors}
          selectedAnchorIdx={0}
          selectedPartialIdx={selectedPartialIdx}
          onSelect={(_, pIdx) => setSelectedPartialIdx(pIdx)}
          minOct={-1}
          maxOct={5}
        />

        {/* Selected Partial Ratio Scrubber & Autocomplete Snap Pills */}
        {stage === 'locked' && selectedPartial && (
          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>
                Partial #{selectedPartialIdx + 1} • Amp {Math.round(selectedPartial.amp * 100)}%
              </span>
              <span className="text-slate-300 font-semibold">
                {formatRatioShort(selectedPartial.ratio)}
              </span>
            </div>
            <RatioScrubber
              ratio={selectedPartial.ratio}
              onChange={handlePartialRatioChange}
              minOctaves={-1}
              maxOctaves={5}
              label={`Partial #${selectedPartialIdx + 1} Ratio`}
            />
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex gap-2">
        {stage === 'armed' || stage === 'capturing' ? (
          <button
            type="button"
            onClick={() => {
              stopMic();
              setStage('idle');
            }}
            className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 font-bold text-xs text-slate-200 transition cursor-pointer"
          >
            Cancel Listening
          </button>
        ) : (
          <button
            type="button"
            onClick={startArmedCapture}
            className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 font-bold text-xs text-white transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            {stage === 'locked' ? (
              <>
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Re-arm &amp; Capture Another Note</span>
              </>
            ) : (
              <span>Arm Microphone (Peak Attack)</span>
            )}
          </button>
        )}

        <button
          type="button"
          disabled={detectedPitch <= 0 || stage !== 'locked'}
          onClick={handleApply}
          className={`flex-1 py-2 rounded-lg font-bold text-xs text-white transition flex items-center justify-center gap-1.5 ${
            detectedPitch > 0 && stage === 'locked'
              ? 'bg-red-600 hover:bg-red-500 cursor-pointer shadow-[0_0_12px_rgba(238,54,16,0.3)]'
              : 'bg-slate-800 opacity-40 cursor-not-allowed'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Apply Spectrum to Scene</span>
        </button>
      </div>
    </div>
  );
};
