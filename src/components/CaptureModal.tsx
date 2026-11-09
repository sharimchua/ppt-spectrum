import React, { useState, useRef } from 'react';
import { Shape } from '../core/types';
import { decomposeTapIntervals, RhythmDecompositionCandidate } from '../core/decompose';
import { detectPitchAutocorrelation } from '../audio/pitch-capture';
import { X, Mic, Radio, Hand, Sparkles } from 'lucide-react';

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureShape: (shape: Shape, dPosition: number) => void;
  tplHz: number;
}

export const CaptureModal: React.FC<CaptureModalProps> = ({
  isOpen,
  onClose,
  onCaptureShape,
  tplHz,
}) => {
  const [activeTab, setActiveTab] = useState<'tap' | 'mic'>('tap');
  const [tapTimestamps, setTapTimestamps] = useState<number[]>([]);
  const [candidates, setCandidates] = useState<RhythmDecompositionCandidate[]>([]);

  // Mic capture state
  const [isListening, setIsListening] = useState(false);
  const [detectedPitch, setDetectedPitch] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const micAnimRef = useRef<number | null>(null);

  if (!isOpen) return null;

  const handleTap = () => {
    const now = performance.now() / 1000;
    const next = [...tapTimestamps, now].slice(-8); // keep last 8 taps
    setTapTimestamps(next);
    const inferred = decomposeTapIntervals(next);
    setCandidates(inferred);
  };

  const handleApplyTapCandidate = (cand: RhythmDecompositionCandidate) => {
    const primaryPeriod = cand.cyclePeriodSec;
    const f0 = 1 / primaryPeriod;
    const d = Math.log2(tplHz / f0);

    const capturedShape: Shape = {
      id: `captured-tap-${Date.now()}`,
      name: `Tap: ${cand.name}`,
      origin: 'captured-rhythm',
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
    onClose();
  };

  const startMicCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);
      const buffer = new Float32Array(analyser.fftSize);

      const poll = () => {
        analyser.getFloatTimeDomainData(buffer);
        const { freqHz, confidence } = detectPitchAutocorrelation(buffer, ctx.sampleRate);
        if (confidence > 0.75 && freqHz > 50) {
          setDetectedPitch(freqHz);
        }
        micAnimRef.current = requestAnimationFrame(poll);
      };
      micAnimRef.current = requestAnimationFrame(poll);
    } catch (e) {
      console.warn('[MicCapture] Failed to access microphone:', e);
      alert('Could not access microphone. Ensure microphone permission is granted.');
    }
  };

  const stopMicCapture = () => {
    if (micAnimRef.current) cancelAnimationFrame(micAnimRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    setIsListening(false);
  };

  const handleApplyMicPitch = () => {
    if (detectedPitch <= 0) return;
    const d = Math.log2(tplHz / detectedPitch);

    const capturedShape: Shape = {
      id: `captured-pitch-${Date.now()}`,
      name: `Mic: ${detectedPitch.toFixed(1)} Hz`,
      origin: 'captured-pitch',
      description: `Monophonic pitch captured from microphone at ${detectedPitch.toFixed(1)} Hz.`,
      partials: [1, 2, 3, 4, 5].map((k) => ({
        id: `p_mic_${k}`,
        ratio: { kind: 'rational', num: k, den: 1 },
        amp: 1 / Math.pow(k, 1.2),
        phase: 0,
        voice: 'woodblock',
        label: `${k}`,
      })),
    };

    onCaptureShape(capturedShape, d);
    stopMicCapture();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0c101a] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-red-500" />
            <h2 className="text-sm font-bold tracking-wide text-white uppercase">Capture Input to Shape</h2>
          </div>
          <button
            onClick={() => { stopMicCapture(); onClose(); }}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="my-4 flex gap-2">
          <button
            onClick={() => { stopMicCapture(); setActiveTab('tap'); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold transition ${
              activeTab === 'tap'
                ? 'border-red-500 bg-red-600/25 text-white'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hand className="h-4 w-4" />
            <span>On-Screen Tap Pad (Rhythm)</span>
          </button>
          <button
            onClick={() => setActiveTab('mic')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold transition ${
              activeTab === 'mic'
                ? 'border-purple-500 bg-purple-600/25 text-white'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="h-4 w-4" />
            <span>Mic Pitch Detector</span>
          </button>
        </div>

        {/* TAP PAD MODE */}
        {activeTab === 'tap' && (
          <div className="space-y-4">
            <button
              onClick={handleTap}
              className="w-full h-32 rounded-xl border border-red-500/50 bg-gradient-to-b from-red-600/20 to-red-950/40 text-red-300 font-bold text-sm tracking-wider hover:border-red-400 active:scale-[0.98] transition flex flex-col items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(238,54,16,0.2)] select-none"
            >
              <Hand className="h-8 w-8 text-red-400 animate-pulse" />
              <span>TAP RHYTHM HERE</span>
              <span className="text-[10px] font-mono opacity-60">Taps recorded: {tapTimestamps.length}</span>
            </button>

            {candidates.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-300">Inferred Candidate Shapes:</span>
                <div className="grid grid-cols-2 gap-2">
                  {candidates.map((cand, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleApplyTapCandidate(cand)}
                      className="p-2.5 rounded-lg border border-slate-700 bg-slate-900/80 hover:border-red-500 text-left transition cursor-pointer"
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

        {/* MIC MODE */}
        {activeTab === 'mic' && (
          <div className="space-y-4 text-center">
            <div className="h-32 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col items-center justify-center gap-2">
              <Radio className={`h-8 w-8 ${isListening ? 'text-purple-400 animate-pulse' : 'text-slate-600'}`} />
              <div className="text-xl font-bold font-mono text-white">
                {detectedPitch > 0 ? `${detectedPitch.toFixed(1)} Hz` : '---'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {isListening ? 'Sing, whistle, or play a steady acoustic note' : 'Click start to listen'}
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
                  onClick={stopMicCapture}
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
                Apply to Scene
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
