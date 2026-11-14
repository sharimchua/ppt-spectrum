import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Shape, VoiceId } from '../../core/types';
import {
  CapturedOnsetEvent,
  clusterSimilarOnsetVoices,
  estimateCyclePeriodSec,
  foldCyclesToConsensus,
  RhythmSimplificationMode,
  simplifyRhythmOnsets,
} from '../../core/decompose';
import { flattenAnchorsToPartials } from '../../core/shape';
import { classifyMicOnsetVoice } from '../../audio/pitch-capture';
import { acquireCaptureAudioStream } from './capture-audio';
import { CycleWheelPreview } from './CycleWheelPreview';
import { CapturedOnsetList } from './CapturedOnsetList';
import { RhythmRecorderControls } from './RhythmRecorderControls';
import { RhythmPreviewBar } from './RhythmPreviewBar';
import { startRhythmPreview, RhythmPreviewHandle } from './rhythm-preview';

export interface RhythmCaptureTabProps {
  tplHz: number;
  onCaptureShape: (shape: Shape, dPosition: number) => void;
  onClose: () => void;
  registerStopHook: (stopFn: () => void) => void;
}

export const RhythmCaptureTab: React.FC<RhythmCaptureTabProps> = ({
  tplHz,
  onCaptureShape,
  onClose,
  registerStopHook,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [autoStopSilence, setAutoStopSilence] = useState(true);
  const [onsetEvents, setOnsetEvents] = useState<CapturedOnsetEvent[]>([]);
  const [selectedOnsetIdx, setSelectedOnsetIdx] = useState<number>(0);
  const [groupSimilar, setGroupSimilar] = useState<boolean>(true);
  const [targetVoices, setTargetVoices] = useState<number>(0); // 0 = Auto, 1..4 = expected voice anchors
  const [rootCycles, setRootCycles] = useState<number>(4);
  const [shapeMode, setShapeMode] = useState<RhythmSimplificationMode>('raw');
  const [cycleOverrideSec, setCycleOverrideSec] = useState<number | undefined>(undefined);
  const [inputLevel, setInputLevel] = useState<number>(0);
  const [sensitivity, setSensitivity] = useState<number>(7);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);

  const sensitivityRef = useRef<number>(7);
  sensitivityRef.current = sensitivity;
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number | null>(null);
  const stopPreviewRef = useRef<RhythmPreviewHandle | null>(null);

  const stopPreview = () => {
    if (stopPreviewRef.current) {
      stopPreviewRef.current.stop();
      stopPreviewRef.current = null;
    }
    setIsPreviewPlaying(false);
  };

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
    setIsListening(false);
    setInputLevel(0);
  };

  useEffect(() => {
    registerStopHook(() => {
      stopMic();
      stopPreview();
    });
    return () => {
      stopMic();
      stopPreview();
    };
  }, [registerStopHook]);

  const startRhythmCapture = async () => {
    try {
      stopMic();
      setOnsetEvents([]);
      setCycleOverrideSec(undefined);
      setSelectedOnsetIdx(0);

      const stream = await acquireCaptureAudioStream();
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

      setIsListening(true);
      const timeBuffer = new Float32Array(analyser.fftSize);
      const freqBuffer = new Float32Array(analyser.frequencyBinCount);
      const prevMagBuffer = new Float32Array(analyser.frequencyBinCount);

      let prevRms = 0;
      let prevLowFlux = 0;
      let prevHighFlux = 0;
      let ambientRms = 0.003;
      let ambientSamples = 0;
      let ambientSum = 0;
      let lastOnsetSec = 0;
      let capturedCount = 0;

      const poll = () => {
        analyser.getFloatTimeDomainData(timeBuffer);
        analyser.getFloatFrequencyData(freqBuffer);

        const { rms, lowFlux, highFlux, voice, centroidHz } = classifyMicOnsetVoice(
          timeBuffer,
          freqBuffer,
          ctx.sampleRate,
          analyser.fftSize,
          prevMagBuffer
        );
        setInputLevel(Math.min(1, rms * 14));

        if (ambientSamples < 10) {
          ambientSum += rms;
          ambientSamples++;
          ambientRms = ambientSum / ambientSamples;
          prevRms = rms;
          prevLowFlux = lowFlux;
          prevHighFlux = highFlux;
          animRef.current = requestAnimationFrame(poll);
          return;
        }

        const now = performance.now() / 1000;
        const sens = sensitivityRef.current;
        // Map sensitivity (1..10) -> default 7 gives minRms ~0.0045, riseFactor ~1.30x
        const minRms = 0.016 - (sens - 1) * 0.0016;
        const riseFactor = 1.6 - (sens - 1) * 0.045;
        const minBandFlux = 2.6 - (sens - 1) * 0.22;
        const floorRms = Math.max(minRms, ambientRms * 1.7);

        const rmsTrigger = rms > floorRms && rms > prevRms * riseFactor;
        const lowFluxTrigger = rms > floorRms * 0.65 && lowFlux > Math.max(minBandFlux * 0.55, prevLowFlux * 1.65);
        const highFluxTrigger = rms > floorRms * 0.6 && highFlux > Math.max(minBandFlux, prevHighFlux * 1.6);

        if ((rmsTrigger || lowFluxTrigger || highFluxTrigger) && now - lastOnsetSec > 0.065) {
          lastOnsetSec = now;
          capturedCount++;
          const vel = Math.max(0.35, Math.min(1.0, rms * 8.0));
          setOnsetEvents((prev) =>
            [...prev, { timestampSec: now, voice, velocity: vel, centroidHz }].slice(-48)
          );
        } else {
          ambientRms = ambientRms * 0.97 + Math.min(rms, ambientRms * 2) * 0.03;
        }

        prevRms = rms * 0.6 + prevRms * 0.4;
        prevLowFlux = lowFlux * 0.65 + prevLowFlux * 0.35;
        prevHighFlux = highFlux * 0.65 + prevHighFlux * 0.35;

        // Auto-stop after 2.5s of trailing silence once at least 2 hits were captured
        if (autoStopSilence && capturedCount >= 2 && now - lastOnsetSec > 2.5) {
          stopMic();
          return;
        }

        animRef.current = requestAnimationFrame(poll);
      };

      animRef.current = requestAnimationFrame(poll);
    } catch (e) {
      console.warn('[RhythmCapture] Failed to access microphone:', e);
      const msg = e instanceof Error ? e.message : 'Could not access microphone.';
      alert(`${msg} Please ensure microphone permission is granted in browser settings.`);
      setIsListening(false);
    }
  };

  const effectiveOnsets = useMemo(
    () =>
      groupSimilar
        ? clusterSimilarOnsetVoices(onsetEvents, 0.55, targetVoices > 0 ? targetVoices : undefined)
        : onsetEvents,
    [onsetEvents, groupSimilar, targetVoices]
  );

  const activeCyclePeriodSec = useMemo(
    () => cycleOverrideSec ?? estimateCyclePeriodSec(effectiveOnsets, rootCycles),
    [effectiveOnsets, cycleOverrideSec, rootCycles]
  );

  const displayOnsets = useMemo(
    () =>
      rootCycles > 1
        ? foldCyclesToConsensus(effectiveOnsets, activeCyclePeriodSec, rootCycles)
        : effectiveOnsets,
    [effectiveOnsets, activeCyclePeriodSec, rootCycles]
  );

  const decomp = useMemo(
    () =>
      simplifyRhythmOnsets(displayOnsets, activeCyclePeriodSec, shapeMode, {
        quantise: false,
        cyclePeriodOverrideSec: activeCyclePeriodSec,
        rootCycles: 1,
        groupByVoice: groupSimilar,
        foldCycles: false,
      }),
    [displayOnsets, activeCyclePeriodSec, shapeMode, groupSimilar]
  );

  const previewShape: Shape = useMemo(
    () => ({
      id: 'captured-rhythm-preview',
      name: `Captured Groove (${decomp.bpm} BPM)`,
      origin: 'captured-rhythm',
      category: 'rhythm',
      description: 'Live captured multi-voice rhythm preview.',
      anchors: decomp.anchors,
      partials: flattenAnchorsToPartials(decomp.anchors),
    }),
    [decomp.anchors, decomp.bpm]
  );

  const getEditableBase = (): CapturedOnsetEvent[] => {
    if (rootCycles > 1) {
      setRootCycles(1);
      setCycleOverrideSec(activeCyclePeriodSec);
      return displayOnsets;
    }
    return effectiveOnsets;
  };

  const toggleOnsetQuantise = (idx: number) => {
    const base = getEditableBase();
    setOnsetEvents(
      base.map((ev, i) =>
        i === idx ? { ...ev, quantise: !ev.quantise, quantisedPhase: undefined } : ev
      )
    );
  };

  const updateOnsetPhase = (idx: number, phaseOffset: number) => {
    const base = getEditableBase();
    setOnsetEvents(
      base.map((ev, i) =>
        i === idx ? { ...ev, quantise: true, quantisedPhase: phaseOffset } : ev
      )
    );
  };

  const cycleVoice = (idx: number) => {
    const order: VoiceId[] = ['kick', 'snare', 'clave', 'hihat'];
    const base = getEditableBase();
    setOnsetEvents(
      base.map((ev, i) => {
        if (i !== idx) return ev;
        const nextIdx = (order.indexOf(ev.voice) + 1) % order.length;
        // Clear centroidHz when manually overridden so clustering won't overwrite the manual choice
        return { ...ev, voice: order[nextIdx], centroidHz: undefined };
      })
    );
  };

  const removeOnset = (idx: number) => {
    const base = getEditableBase();
    setOnsetEvents(base.filter((_, i) => i !== idx));
    setSelectedOnsetIdx((prev) => Math.max(0, Math.min(prev, base.length - 2)));
  };

  const handleApplyGroove = () => {
    if (decomp.anchors.length === 0) return;
    const f0 = 1 / decomp.cyclePeriodSec;
    const d = Math.log2(tplHz / f0);

    const capturedShape: Shape = {
      id: `captured-groove-${Date.now()}`,
      name: `Captured Groove (${decomp.bpm} BPM)`,
      origin: 'captured-rhythm',
      category: 'rhythm',
      description: `Multi-voice rhythm captured with ${decomp.anchors.length} Voice Anchors (${decomp.anchors
        .map((a) => a.offsetToken)
        .join(', ')}).`,
      anchors: decomp.anchors,
      partials: flattenAnchorsToPartials(decomp.anchors),
    };

    onCaptureShape(capturedShape, d);
    stopMic();
    stopPreview();
    onClose();
  };

  const togglePreview = () => {
    if (isPreviewPlaying) {
      stopPreview();
      return;
    }
    if (decomp.anchors.length === 0) return;
    stopPreview();
    stopPreviewRef.current = startRhythmPreview(previewShape, decomp.cyclePeriodSec);
    setIsPreviewPlaying(true);
  };

  return (
    <div className="space-y-4">
      <RhythmRecorderControls
        isListening={isListening}
        onsetCount={onsetEvents.length}
        targetVoices={targetVoices}
        rootCycles={rootCycles}
        autoStopSilence={autoStopSilence}
        sensitivity={sensitivity}
        inputLevel={inputLevel}
        onTargetVoicesChange={setTargetVoices}
        onRootCyclesChange={(c) => {
          setRootCycles(c);
          setCycleOverrideSec(undefined);
        }}
        onAutoStopChange={setAutoStopSilence}
        onSensitivityChange={setSensitivity}
        onStartCapture={startRhythmCapture}
        onStopCapture={stopMic}
        onClear={() => {
          stopMic();
          setOnsetEvents([]);
          setCycleOverrideSec(undefined);
        }}
      />

      {/* Review Display: Cycle Wheel + Selective Per-Onset Quantisation + Preview Bar */}
      {onsetEvents.length > 0 && (
        <div className="space-y-2.5">
          {rootCycles > 1 && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-mono text-emerald-300 flex items-center justify-between">
              <span>
                {rootCycles}-Cycle Consensus: {displayOnsets.length} recurring beat{displayOnsets.length === 1 ? '' : 's'} extracted from {onsetEvents.length} raw hits
              </span>
              <span>{(activeCyclePeriodSec * 1000).toFixed(0)} ms / cycle</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CycleWheelPreview
              shape={previewShape}
              cyclePeriodSec={decomp.cyclePeriodSec}
              tplHz={tplHz}
              isPlaying={isPreviewPlaying}
              getAudioPhase={() => stopPreviewRef.current?.getPhase() ?? 0}
            />
            <CapturedOnsetList
              onsetEvents={displayOnsets}
              cyclePeriodSec={decomp.cyclePeriodSec}
              bpm={decomp.bpm}
              selectedOnsetIdx={selectedOnsetIdx}
              groupSimilar={groupSimilar}
              onToggleGroupSimilar={() => setGroupSimilar((prev) => !prev)}
              onSelectOnset={setSelectedOnsetIdx}
              onCycleVoice={cycleVoice}
              onToggleQuantise={toggleOnsetQuantise}
              onUpdatePhase={updateOnsetPhase}
              onRemoveOnset={removeOnset}
              onAdjustCycleSec={setCycleOverrideSec}
            />
          </div>

          <RhythmPreviewBar
            shapeMode={shapeMode}
            summary={decomp.summary}
            bpm={decomp.bpm}
            anchorCount={decomp.anchors.length}
            hasCycleOverride={cycleOverrideSec !== undefined}
            isPreviewPlaying={isPreviewPlaying}
            onSelectMode={(modeKey) => {
              stopPreview();
              setShapeMode(modeKey);
            }}
            onTempoChange={(nextBpm) => {
              const nextCycleSec = Number(((60 * 4) / nextBpm).toFixed(4));
              const scale = decomp.cyclePeriodSec > 0 ? activeCyclePeriodSec / decomp.cyclePeriodSec : 1;
              setCycleOverrideSec(Number((nextCycleSec * scale).toFixed(4)));
              if (isPreviewPlaying) stopPreview();
            }}
            onResetTempo={() => {
              setCycleOverrideSec(undefined);
              if (isPreviewPlaying) stopPreview();
            }}
            onTogglePreview={togglePreview}
            onApply={handleApplyGroove}
          />
        </div>
      )}
    </div>
  );
};
