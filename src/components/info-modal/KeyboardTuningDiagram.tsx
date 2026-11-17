/**
 * Interactive explorer for Thought Experiment 7:
 * Compares 12-TET drift vs 5-Limit (Qui) super-cycle lock on the Solfège Keyboard in Rhythm Space,
 * and illustrates Melodic Rhythm (tempo cadences such as 3:2 So→Do and 4:3 Fa→Do).
 * Strictly maintains Australian English spelling.
 */

import React, { useState, useEffect } from 'react';
import { Keyboard, Lock, Play, Shuffle, ArrowLeftRight, Sparkles } from 'lucide-react';
import { CustomTutorialDemoOverride, TutorialDemoId, ContextualDemoAction } from './tutorial-demos';
import { buildTempoCadenceOverride } from './tempo-cadence-demos';

interface KeyboardTuningDiagramProps {
  onPlayDemo: (demoId: TutorialDemoId, customOverride?: CustomTutorialDemoOverride) => void;
  onRegisterContextualDemo?: (action: ContextualDemoAction) => void;
}

type ExplorerTab = 'drift-vs-lock' | 'tempo-cadences';
type TuningMode = '5-limit' | '12tet';

interface CadenceExample {
  id: string;
  name: string;
  keysLabel: string;
  ratioLabel: string;
  bpmStepLabel: string;
  pitchEquivalent: string;
  description: string;
}

const CADENCE_EXAMPLES: CadenceExample[] = [
  {
    id: 'perfect-3-2',
    name: 'Perfect Tempo Cadence (V → I)',
    keysLabel: 'So → Do',
    ratioLabel: '3 : 2 → 1 : 1',
    bpmStepLabel: '145.1 BPM → 96.75 BPM',
    pitchEquivalent: 'Perfect Fifth resolving home to Root',
    description:
      'Stepping from So down to Do slows the bar pulse by an exact 3:2 ratio—every 3 beats of the old tempo equal 2 beats of the new tempo.',
  },
  {
    id: 'plagal-4-3',
    name: 'Plagal ("Amen") Tempo Cadence (IV → I)',
    keysLabel: 'Fa → Do',
    ratioLabel: '4 : 3 → 1 : 1',
    bpmStepLabel: '129.0 BPM → 96.75 BPM',
    pitchEquivalent: 'Perfect Fourth resolving home to Root',
    description:
      'Stepping from Fa to Do relaxes the tempo by an exact 4:3 ratio—4 beats of Fa occupy the exact same time span as 3 beats of Do.',
  },
  {
    id: 'arpeggio-4-5-6',
    name: 'Major Triad Tempo Phrase (4 : 5 : 6)',
    keysLabel: 'Do → Mi → So → Do′',
    ratioLabel: '1:1 → 5:4 → 3:2 → 2:1',
    bpmStepLabel: '96.8 → 120.9 → 145.1 → 193.5 BPM',
    pitchEquivalent: 'Major Triad Arpeggio across 1 Octave',
    description:
      'Playing Do, Mi, So, and high Do one after another steps the groove through a melodic tempo contour; holding them together with Hold (H) stacks all four tempos into a polyrhythm!',
  },
];

export const KeyboardTuningDiagram: React.FC<KeyboardTuningDiagramProps> = ({
  onPlayDemo,
  onRegisterContextualDemo,
}) => {
  const [activeTab, setActiveTab] = useState<ExplorerTab>('drift-vs-lock');
  const [tuningMode, setTuningMode] = useState<TuningMode>('5-limit');
  const [selectedCadenceId, setSelectedCadenceId] = useState<string>('perfect-3-2');

  const isJust = tuningMode === '5-limit';
  const miRatio = isJust ? 1.25 : Math.pow(2, 4 / 12); // 1.2500 vs 1.259921
  const selectedCadence =
    CADENCE_EXAMPLES.find((c) => c.id === selectedCadenceId) ?? CADENCE_EXAMPLES[0];

  useEffect(() => {
    if (!onRegisterContextualDemo) return;
    if (activeTab === 'drift-vs-lock') {
      onRegisterContextualDemo({
        cardId: 'keyboard-tuning',
        label: isJust ? 'Hear 5-Limit Lock' : 'Hear 12-TET Drift',
        demoId: isJust ? 'keyboard-5limit-lock' : 'keyboard-12tet-drift',
        fromSection: 'concepts',
      });
    } else {
      onRegisterContextualDemo({
        cardId: 'keyboard-tuning',
        label: `Hear ${selectedCadence.ratioLabel} Cadence`,
        demoId: 'tempo-cadence-modulation',
        fromSection: 'concepts',
        customOverride: buildTempoCadenceOverride(selectedCadence.id),
      });
    }
  }, [activeTab, isJust, selectedCadence.id, selectedCadence.ratioLabel, onRegisterContextualDemo]);

  // Positions across a 4-bar (4 Do beats) timeline normalised to [0..1]
  const doBeats = [0, 0.25, 0.5, 0.75, 1.0];
  const miBeats: number[] = [];
  for (let k = 0; k <= 5; k++) {
    const pos = k / (4 * miRatio);
    if (pos <= 1.005) miBeats.push(pos);
  }

  return (
    <div
      data-demo-card="keyboard-tuning"
      className="rounded-xl border border-slate-800 bg-slate-950/90 p-4 space-y-4"
    >
      {/* Mode Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Keyboard className="h-4 w-4 text-cyan-400 shrink-0" />
          <span className="text-xs font-bold text-white font-mono">
            Interactive Solfège Keyboard Explorer: Polyrhythm Tuning &amp; Tempo Cadences
          </span>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 p-0.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('drift-vs-lock')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
              activeTab === 'drift-vs-lock'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            1. Hold 2 Keys: 12-TET Drift vs 5-Limit Lock
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tempo-cadences')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
              activeTab === 'tempo-cadences'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            2. 1 Key at a Time: Tempo Cadences
          </button>
        </div>
      </div>

      {activeTab === 'drift-vs-lock' ? (
        <div className="space-y-3.5">
          {/* Tuning Toggle Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/70 rounded-lg p-2.5 border border-slate-800">
            <div className="text-xs text-slate-300">
              Holding <strong className="text-red-400 font-mono">Do</strong> +{' '}
              <strong className="text-yellow-300 font-mono">Mi</strong> (Major Third) on a single{' '}
              <strong className="text-white">Pure Sine</strong> pulse in Rhythm Space:
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setTuningMode('12tet')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border transition cursor-pointer ${
                  !isJust
                    ? 'bg-rose-950/90 border-rose-400 text-rose-200 shadow-[0_0_12px_rgba(251,113,133,0.25)]'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Shuffle className="h-3 w-3" />
                <span>12-TET Piano (400¢)</span>
              </button>
              <button
                type="button"
                onClick={() => setTuningMode('5-limit')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border transition cursor-pointer ${
                  isJust
                    ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.25)]'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Lock className="h-3 w-3" />
                <span>5-Limit Just (386.3¢)</span>
              </button>
            </div>
          </div>

          {/* 4-Bar Coincidence Timeline SVG */}
          <div className="rounded-lg border border-slate-800/90 bg-[#070a12] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-[11px] font-mono">
              <span className="text-slate-300">
                4-Bar Super-Cycle Timeline (<strong className="text-red-400">4 Do bars</strong> vs{' '}
                <strong className="text-yellow-300">5 Mi beats</strong>)
              </span>
              <span
                className={`px-2 py-0.5 rounded border font-bold ${
                  isJust
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                }`}
              >
                {isJust
                  ? 'Interval Band: 5:4 Exact (Locks on The Sam every 4 bars!)'
                  : 'Interval Band: ~3.9:3.1 (1.2599× — Drifts early & never locks!)'}
              </span>
            </div>

            <svg viewBox="0 0 600 92" className="w-full h-24 overflow-visible select-none">
              {/* Vertical Bar Gridlines for Do */}
              {doBeats.map((pos, idx) => {
                const x = 55 + pos * 515;
                const isSam = idx === 0 || idx === 4;
                return (
                  <g key={`grid-${idx}`}>
                    <line
                      x1={x}
                      y1={12}
                      x2={x}
                      y2={76}
                      stroke={isSam ? '#34d399' : '#334155'}
                      strokeWidth={isSam ? 1.5 : 1}
                      strokeDasharray={isSam ? undefined : '3 3'}
                    />
                    <text
                      x={x}
                      y={88}
                      textAnchor="middle"
                      className="fill-slate-400 text-[9px] font-mono"
                    >
                      {idx === 0 ? 'Sam (Bar 1)' : idx === 4 ? '4-Bar Sam' : `Bar ${idx + 1}`}
                    </text>
                  </g>
                );
              })}

              {/* Track Labels */}
              <text x={8} y={32} className="fill-red-400 text-[11px] font-mono font-bold">
                Do (1×)
              </text>
              <text x={8} y={62} className="fill-yellow-300 text-[11px] font-mono font-bold">
                Mi ({isJust ? '5:4' : '2⁴/¹²'})
              </text>

              {/* Do Beats (4 Bars) */}
              {doBeats.map((pos, idx) => {
                const x = 55 + pos * 515;
                return (
                  <circle
                    key={`do-${idx}`}
                    cx={x}
                    cy={28}
                    r={6}
                    fill="#f87171"
                    stroke="#0f172a"
                    strokeWidth={1.5}
                  />
                );
              })}

              {/* Mi Beats */}
              {miBeats.map((pos, idx) => {
                const x = 55 + pos * 515;
                const isLast = idx === 5;
                const locksOnSam = isLast && isJust;
                return (
                  <g key={`mi-${idx}`}>
                    <circle
                      cx={x}
                      cy={58}
                      r={6}
                      fill={isLast && !isJust ? '#fb7185' : '#fde047'}
                      stroke="#0f172a"
                      strokeWidth={1.5}
                    />
                    {isLast && (
                      <text
                        x={x}
                        y={10}
                        textAnchor="middle"
                        className={`text-[9px] font-mono font-bold ${
                          locksOnSam ? 'fill-emerald-300' : 'fill-rose-400'
                        }`}
                      >
                        {locksOnSam ? '✓ Exact Lock!' : '← Lands 3.1% Early (Drifts!)'}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
              {isJust ? (
                <>
                  In <strong className="text-emerald-300">5-Limit Just (Qui)</strong>,{' '}
                  <span className="font-mono text-yellow-300">Mi</span> vibrates at an exact{' '}
                  <strong className="text-white">5:4 (1.25×)</strong> ratio to{' '}
                  <span className="font-mono text-red-400">Do</span>. Beat 5 of Mi lands squarely on
                  Beat 4 of Do—creating a rock-solid 4-bar polyrhythm below 25.8 Hz and a pure,
                  beatless Major Third chord when you press <kbd className="font-mono text-cyan-300">Tab</kbd>!
                </>
              ) : (
                <>
                  In <strong className="text-rose-300">12-TET (Equal Temperament)</strong>, every
                  semitone is spaced by exactly 100¢ so pianos can change key easily. That makes{' '}
                  <span className="font-mono text-yellow-300">Mi</span> slightly sharp (
                  <strong className="text-white">1.2599×</strong> instead of 1.25×). In Pitch Space
                  you hear that as a gentle chorus shimmer—but in Rhythm Space, the yellow drummer is
                  playing at a slightly faster tempo and <strong>steadily drifts out of time</strong>!
                </>
              )}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {CADENCE_EXAMPLES.map((cad) => (
              <button
                key={cad.id}
                type="button"
                onClick={() => setSelectedCadenceId(cad.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition cursor-pointer ${
                  selectedCadence.id === cad.id
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cad.keysLabel} ({cad.ratioLabel})
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-amber-300 text-sm">{selectedCadence.name}</strong>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300">
                {selectedCadence.bpmStepLabel}
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">{selectedCadence.description}</p>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
              <ArrowLeftRight className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span>
                <strong>Pitch Mirror (Press Tab):</strong> {selectedCadence.pitchEquivalent}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Explicit Keyboard Demo Launch Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-3">
        <div className="flex items-center gap-2 text-xs text-stone-200">
          <Sparkles className="h-4 w-4 text-cyan-400 shrink-0" />
          <span>
            {activeTab === 'drift-vs-lock' ? (
              <>
                <strong>Try on the Live Keyboard:</strong> Opens the Solfège Keyboard (
                <kbd className="font-mono text-cyan-300">K</kbd>) in Rhythm Space with{' '}
                <kbd className="font-mono text-amber-300">Hold (H)</kbd> and Interval Bands matching
                your selection above.
              </>
            ) : (
              <>
                <strong>Hear Metric Modulation Live:</strong> Uses a{' '}
                <strong className="text-amber-300">Supercycle Band Filter</strong> to step between
                the selected tempo layers on each rotation against The Sam.
              </>
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {activeTab === 'drift-vs-lock' ? (
            <>
              <button
                type="button"
                onClick={() => onPlayDemo('keyboard-12tet-drift')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-[11px] transition cursor-pointer border ${
                  !isJust
                    ? 'bg-rose-500/30 text-rose-100 border-rose-400 ring-1 ring-rose-400/40'
                    : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border-rose-500/40'
                }`}
              >
                <Play className="w-3 h-3 fill-current" />
                <span>12-TET Drift (Do+Mi)</span>
              </button>
              <button
                type="button"
                onClick={() => onPlayDemo('keyboard-5limit-lock')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-[11px] transition cursor-pointer border ${
                  isJust
                    ? 'bg-emerald-500/30 text-emerald-100 border-emerald-400 ring-1 ring-emerald-400/40'
                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border-emerald-500/40'
                }`}
              >
                <Play className="w-3 h-3 fill-current" />
                <span>5-Limit 5:4 Lock (Do+Mi)</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() =>
                onPlayDemo(
                  'tempo-cadence-modulation',
                  buildTempoCadenceOverride(selectedCadence.id)
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/25 hover:bg-amber-500/35 text-amber-100 border border-amber-400 font-semibold text-[11px] transition cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Try {selectedCadence.keysLabel} ({selectedCadence.ratioLabel}) Live</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
