/**
 * Section 3: Tuning Systems Beyond 12 Tones
 * Interactive guide to Pythagorean 3:2 chains (Pentatonic vs Heptatonic),
 * 31-EDO microtonality, and Tuning-driven Strum & Alternate Surfaces.
 * Australian English spelling maintained.
 */

import React, { useMemo, useState } from 'react';
import { Music, Play, Sparkles, GitBranch, Grid3X3 } from 'lucide-react';
import { buildPythagoreanChainDegrees } from '../../core/tuning-systems';
import {
  CustomTutorialDemoOverride,
  TutorialDemoId,
  TutorialSectionId,
} from './tutorial-demos';

export interface TuningSystemsSectionProps {
  onPlayDemo?: (
    demoId?: TutorialDemoId,
    fromSection?: TutorialSectionId,
    customOverride?: CustomTutorialDemoOverride
  ) => void;
}

const EDO31_COMPARISONS = [
  {
    interval: 'Major 3rd',
    just: '5:4 (386.3¢)',
    edo12: '4\\12 (400.0¢, +13.7¢)',
    edo31: '10\\31 (387.1¢, +0.8¢)',
  },
  {
    interval: 'Perfect 5th',
    just: '3:2 (702.0¢)',
    edo12: '7\\12 (700.0¢, −2.0¢)',
    edo31: '18\\31 (696.8¢, −5.2¢)',
  },
  {
    interval: 'Harmonic 7th',
    just: '7:4 (968.8¢)',
    edo12: '10\\12 (1000.0¢, +31.2¢)',
    edo31: '25\\31 (967.7¢, −1.1¢)',
  },
  {
    interval: 'Septimal m3',
    just: '7:6 (266.9¢)',
    edo12: '3\\12 (300.0¢, +33.1¢)',
    edo31: '7\\31 (271.0¢, +4.1¢)',
  },
];

export const TuningSystemsSection: React.FC<TuningSystemsSectionProps> = ({ onPlayDemo }) => {
  const [chainLength, setChainLength] = useState<number>(5);
  const chainDegrees = useMemo(() => buildPythagoreanChainDegrees(chainLength), [chainLength]);
  const activeCount = chainDegrees.filter((d) => d.active).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300">
          <Music className="w-3.5 h-3.5" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-stone-100">
            3. Tuning Systems Beyond 12 Tones
          </h3>
          <p className="text-[11px] text-stone-400">
            Shapes supply timbre &amp; overtones; Tuning defines the pitch &amp; rhythm lattice.
          </p>
        </div>
      </div>

      {/* Card 1: Pentatonic vs Heptatonic via 3:2 Chain */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-stone-100">
              Pentatonic vs Heptatonic: The 3:2 Fifths Chain
            </h4>
          </div>
          {onPlayDemo && (
            <button
              type="button"
              onClick={() => onPlayDemo('pythagorean-pentatonic-demo', 'tuning')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 transition cursor-pointer"
            >
              <Play className="w-3 h-3" />
              Try Live: 5 vs 7 Fifths
            </button>
          )}
        </div>

        <p className="text-xs text-stone-300 leading-relaxed">
          Stacking simple <code className="text-emerald-300">3:2</code> fifths (and reducing by{' '}
          <code className="text-sky-300">2:1</code> octaves) builds scales from a single building block.
          Stopping at <strong>5 fifths</strong> yields the <strong>Pentatonic</strong> scale—deliberately
          avoiding minor 2nds and tritones. Extending to <strong>7 fifths</strong> (Heptatonic)
          introduces the two <code className="text-amber-300">90.2¢</code> semitones and the{' '}
          <code className="text-rose-300">729/512</code> tritone.
        </p>

        {/* Interactive 3:2 Chain Slider & Degree Strip */}
        <div className="rounded-lg bg-stone-950/80 border border-stone-800 p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-stone-200">
              Active Chain Steps: <span className="text-emerald-300 font-mono">{activeCount}</span>{' '}
              ({chainLength === 5 ? 'Pentatonic' : chainLength === 7 ? 'Heptatonic' : chainLength === 12 ? '12-Tone Pythagorean' : 'Custom'})
            </span>
            <div className="flex items-center gap-1.5">
              {[5, 7, 12].map((len) => (
                <button
                  key={len}
                  type="button"
                  onClick={() => setChainLength(len)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer ${
                    chainLength === len
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                      : 'bg-stone-900 border-stone-700 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {len === 5 ? '5 (Pentatonic)' : len === 7 ? '7 (Heptatonic)' : '12 (Full)'}
                </button>
              ))}
            </div>
          </div>

          <input
            type="range"
            min={1}
            max={12}
            value={chainLength}
            onChange={(e) => setChainLength(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
            aria-label="Pythagorean 3:2 chain length"
          />

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
            {chainDegrees.map((deg) => (
              <div
                key={deg.index}
                className={`rounded-md border px-2 py-1 text-center font-mono transition ${
                  !deg.active
                    ? 'bg-stone-950/40 border-stone-800/50 text-stone-600'
                    : deg.highlightRole === 'tritone'
                    ? 'bg-rose-950/60 border-rose-500/60 text-rose-200'
                    : deg.highlightRole === 'semitone'
                    ? 'bg-amber-950/60 border-amber-500/60 text-amber-200'
                    : 'bg-emerald-950/50 border-emerald-600/50 text-emerald-200'
                }`}
              >
                <div className="text-[11px] font-bold">{deg.label}</div>
                <div className="text-[9px] opacity-80">{deg.subLabel}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card 2: 31-EDO & Microtonality */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-stone-100">
              31-EDO: Microtonal Meantone &amp; 7-Limit Harmony
            </h4>
          </div>
          <div className="flex items-center gap-1.5">
            {onPlayDemo && (
              <>
                <button
                  type="button"
                  onClick={() => onPlayDemo('31edo-meantone-demo', 'tuning')}
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 px-2.5 py-1 text-[11px] font-semibold text-amber-300 transition cursor-pointer"
                >
                  <Play className="w-3 h-3" />
                  Try 31-EDO Meantone
                </button>
                <button
                  type="button"
                  onClick={() => onPlayDemo('31edo-septimal-demo', 'tuning')}
                  className="inline-flex items-center gap-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 px-2.5 py-1 text-[11px] font-semibold text-purple-300 transition cursor-pointer"
                >
                  <Play className="w-3 h-3" />
                  Try 7-Limit
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed">
          Dividing the octave into <strong>31 equal steps</strong> (<code className="text-amber-300">38.7¢</code> each)
          hits pure <code className="text-amber-300">5/4</code> major thirds and{' '}
          <code className="text-purple-300">7/4</code> harmonic sevenths far more accurately than 12-TET,
          while preserving familiar diatonic and meantone chord shapes.
        </p>

        <div className="overflow-x-auto rounded-lg border border-stone-800">
          <table className="w-full text-left text-[11px] font-mono">
            <thead className="bg-stone-950 text-stone-400 border-b border-stone-800">
              <tr>
                <th className="px-2.5 py-1.5">Interval</th>
                <th className="px-2.5 py-1.5">Just Ratio</th>
                <th className="px-2.5 py-1.5">12-TET</th>
                <th className="px-2.5 py-1.5 text-amber-300">31-EDO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/70 bg-stone-950/50">
              {EDO31_COMPARISONS.map((row) => (
                <tr key={row.interval}>
                  <td className="px-2.5 py-1.5 font-sans font-semibold text-stone-200">{row.interval}</td>
                  <td className="px-2.5 py-1.5 text-emerald-300">{row.just}</td>
                  <td className="px-2.5 py-1.5 text-stone-400">{row.edo12}</td>
                  <td className="px-2.5 py-1.5 text-amber-300">{row.edo31}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card 3: Strum Mode & Alternate Surfaces */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-rose-400" />
          <h4 className="text-xs font-bold text-stone-100">
            Playable Surfaces: Strum Mode, Scale Strip, Isomorphic &amp; Guitar
          </h4>
        </div>
        <p className="text-xs text-stone-300 leading-relaxed">
          Enable <strong>Strum</strong> in the top toolbar to drag, scroll, or auto-walk through
          the active Tuning&apos;s degrees with full instrument overtones—in Pitch Space or Rhythm Space.
          Open the <strong>Virtual Keyboard</strong> (<kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px]">K</kbd>)
          to switch between <strong>Piano</strong>, <strong>Scale Strip</strong> (active degrees only),{' '}
          <strong>Isomorphic Lattice</strong> (<code className="text-emerald-300">3:2</code> fifths ×{' '}
          <code className="text-amber-300">5:4</code> thirds), and a <strong>6-String Guitar Fretboard</strong>.
        </p>
      </div>
    </div>
  );
};
