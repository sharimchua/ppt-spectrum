import React, { useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { TutorialDemoId, CustomTutorialDemoOverride } from './tutorial-demos';

interface PartialItem {
  ratioVal: number;
  amp: number;
  label: string;
  color: string;
}

interface TimbrePreset {
  id: string;
  name: string;
  shortName: string;
  category: string;
  demoId: TutorialDemoId;
  partials: PartialItem[];
  rhythmDescription: string;
  pitchDescription: string;
}

const TIMBRE_PRESETS: TimbrePreset[] = [
  {
    id: 'sine',
    name: 'Sine Wave (Pure Tone)',
    shortName: 'Pure Sine',
    category: 'Single Pulse',
    demoId: 'sine-timbre',
    partials: [
      { ratioVal: 1, amp: 1.0, label: '1×', color: '#FF4D4D' },
      { ratioVal: 2, amp: 0.0, label: '2×', color: '#FB923C' },
      { ratioVal: 3, amp: 0.0, label: '3×', color: '#60A5FA' },
      { ratioVal: 4, amp: 0.0, label: '4×', color: '#FB923C' },
      { ratioVal: 5, amp: 0.0, label: '5×', color: '#FDE047' },
      { ratioVal: 6, amp: 0.0, label: '6×', color: '#60A5FA' },
      { ratioVal: 7, amp: 0.0, label: '7×', color: '#F472B6' },
      { ratioVal: 8, amp: 0.0, label: '8×', color: '#FB923C' },
    ],
    rhythmDescription: 'A single steady metronome pulse repeating once per bar—no subdivision accents.',
    pitchDescription: 'A pure, smooth whistle or tuning fork with zero overtone buzz.',
  },
  {
    id: 'sawtooth',
    name: 'Sawtooth (All Harmonics 1/k)',
    shortName: 'Sawtooth',
    category: 'Rich String / Brass',
    demoId: 'sawtooth-timbre',
    partials: [
      { ratioVal: 1, amp: 1.0, label: '1×', color: '#FF4D4D' },
      { ratioVal: 2, amp: 0.5, label: '2×', color: '#FB923C' },
      { ratioVal: 3, amp: 0.33, label: '3×', color: '#60A5FA' },
      { ratioVal: 4, amp: 0.25, label: '4×', color: '#FB923C' },
      { ratioVal: 5, amp: 0.2, label: '5×', color: '#FDE047' },
      { ratioVal: 6, amp: 0.17, label: '6×', color: '#60A5FA' },
      { ratioVal: 7, amp: 0.14, label: '7×', color: '#F472B6' },
      { ratioVal: 8, amp: 0.12, label: '8×', color: '#FB923C' },
    ],
    rhythmDescription: 'A complete polyrhythmic tree where 1×, 2×, 3×, 4×, 5×… all slam together on Beat 1.',
    pitchDescription: 'Bright, buzzing tone rich in every harmonic (bowed violin or brass).',
  },
  {
    id: 'square',
    name: 'Square / Clarinet (Odd Harmonics)',
    shortName: 'Clarinet (Odd)',
    category: 'Hollow Reed',
    demoId: 'clarinet-timbre',
    partials: [
      { ratioVal: 1, amp: 1.0, label: '1×', color: '#FF4D4D' },
      { ratioVal: 2, amp: 0.0, label: '2×', color: '#FB923C' },
      { ratioVal: 3, amp: 0.5, label: '3×', color: '#60A5FA' },
      { ratioVal: 4, amp: 0.0, label: '4×', color: '#FB923C' },
      { ratioVal: 5, amp: 0.3, label: '5×', color: '#FDE047' },
      { ratioVal: 6, amp: 0.0, label: '6×', color: '#60A5FA' },
      { ratioVal: 7, amp: 0.2, label: '7×', color: '#F472B6' },
      { ratioVal: 8, amp: 0.0, label: '8×', color: '#FB923C' },
    ],
    rhythmDescription: 'Only odd subdivisions (3× triplets, 5× quintuplets, 7× septuplets) with no even backbeats.',
    pitchDescription: 'Hollow, woody resonance characteristic of a clarinet or square wave.',
  },
  {
    id: 'bell',
    name: 'Church Bell (Stretched Modes)',
    shortName: 'Church Bell',
    category: 'Inharmonic Chime',
    demoId: 'bell-timbre',
    partials: [
      { ratioVal: 0.5, amp: 0.85, label: '0.5×', color: '#38bdf8' },
      { ratioVal: 1.0, amp: 1.0, label: '1.0×', color: '#FF4D4D' },
      { ratioVal: 1.18, amp: 0.75, label: '1.2×', color: '#FDE047' },
      { ratioVal: 1.51, amp: 0.6, label: '1.5×', color: '#60A5FA' },
      { ratioVal: 2.01, amp: 0.8, label: '2.0×', color: '#C084FC' },
      { ratioVal: 2.51, amp: 0.45, label: '2.5×', color: '#F472B6' },
    ],
    rhythmDescription: 'Non-integer rhythms that drift past each other and never neatly repeat in a single bar.',
    pitchDescription: 'Metallic chime with a slow, hypnotic shimmer and minor-third bell overtone.',
  },
];

interface OvertoneTimbreDiagramProps {
  onPlayDemo?: (demoId: TutorialDemoId, customOverride?: CustomTutorialDemoOverride) => void;
}

export const OvertoneTimbreDiagram: React.FC<OvertoneTimbreDiagramProps> = ({ onPlayDemo }) => {
  const [activePresetId, setActivePresetId] = useState<string>('sawtooth');
  const [customPartials, setCustomPartials] = useState<PartialItem[] | null>(null);

  const activePreset = TIMBRE_PRESETS.find((p) => p.id === activePresetId) || TIMBRE_PRESETS[1];
  const partials = customPartials || activePreset.partials;

  const handleSelectPreset = (id: string) => {
    setActivePresetId(id);
    setCustomPartials(null);
  };

  const handleCyclePartialAmp = (idx: number) => {
    const next = partials.map((p, i) => {
      if (i !== idx) return p;
      const nextAmp = p.amp === 0 ? 0.35 : p.amp < 0.5 ? 0.7 : p.amp < 0.9 ? 1.0 : 0.0;
      return { ...p, amp: nextAmp };
    });
    // Ensure at least one partial remains audible
    if (next.every((p) => p.amp === 0)) {
      next[0] = { ...next[0], amp: 1.0 };
    }
    setCustomPartials(next);
  };

  const wavePoints = 120;
  const waveWidth = 260;
  const waveHeight = 68;
  const waveMidY = 34;

  const pathD = (() => {
    let dStr = '';
    const totalAmp = partials.reduce((sum, p) => sum + p.amp, 0) || 1;

    for (let i = 0; i <= wavePoints; i++) {
      const t = (i / wavePoints) * 2.0;
      let yVal = 0;
      for (const p of partials) {
        if (p.amp > 0) {
          yVal += Math.cos(2 * Math.PI * t * p.ratioVal) * p.amp;
        }
      }
      const normalizedY = (yVal / totalAmp) * (waveHeight * 0.42);
      const x = (i / wavePoints) * waveWidth;
      const y = waveMidY - normalizedY;
      dStr += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return dStr;
  })();

  const activeCount = partials.filter((p) => p.amp > 0).length;

  const handleLaunchLive = () => {
    if (!onPlayDemo) return;
    if (customPartials) {
      onPlayDemo('custom-timbre', {
        title: 'Custom Overtone Mix (Groove ↔ Tone)',
        shortTitle: 'Custom Overtone Mix',
        badge: `${activeCount} Active Partials`,
        listenHint:
          'Listening to the exact overtone amplitude mix you created in the tutorial, sweeping from 90 BPM rhythm into A3 pitch!',
        customPartials,
      });
    } else {
      onPlayDemo(activePreset.demoId);
    }
  };

  return (
    <div className="w-full flex flex-col p-3.5 sm:p-4 bg-slate-950/85 border border-slate-800/90 rounded-xl select-none space-y-3.5 shadow-lg">
      {/* Header & Preset Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div>
          <span className="text-xs sm:text-sm font-bold text-white font-mono">
            Interactive Overtone Mixer: Amplitude Weights = Timbre &amp; Accents
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            Click any harmonic bar to change its <strong>amplitude</strong> (loudness) and hear your exact mix live!
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1 self-start sm:self-auto">
          {TIMBRE_PRESETS.map((tp) => (
            <button
              key={tp.id}
              onClick={() => handleSelectPreset(tp.id)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition cursor-pointer border ${
                activePresetId === tp.id && !customPartials
                  ? 'bg-red-950/90 border-red-500 text-white shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {tp.shortName}
            </button>
          ))}
          {customPartials && (
            <button
              onClick={() => setCustomPartials(null)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 border border-amber-500/40 text-amber-300 cursor-pointer"
              title="Reset to preset"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Bars + Waveform */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Left: Clickable Partial Bars */}
        <div className="md:col-span-6 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-b border-slate-800/60 pb-1">
            <span>Click Bars to Mix Amplitude (0–1.0)</span>
            <span className="text-cyan-400 font-bold">
              {customPartials ? `Custom Mix (${activeCount} active)` : `${activeCount} Active Partials`}
            </span>
          </div>

          <div className="flex items-end justify-between h-24 gap-1.5 pt-2 px-1">
            {partials.map((p, idx) => {
              const barHeightPct = p.amp > 0 ? Math.max(14, Math.round(p.amp * 100)) : 6;
              return (
                <button
                  key={idx}
                  onClick={() => handleCyclePartialAmp(idx)}
                  className="flex-1 flex flex-col items-center gap-1 h-full justify-end group cursor-pointer focus:outline-none"
                  title={`Click to cycle ${p.label} amplitude`}
                >
                  <span className="text-[8px] font-mono text-slate-300 group-hover:text-white">
                    {p.amp > 0 ? p.amp.toFixed(2) : 'OFF'}
                  </span>
                  <div
                    className="w-full rounded-t transition-all duration-150 group-hover:brightness-125"
                    style={{
                      height: `${barHeightPct}%`,
                      backgroundColor: p.amp > 0 ? p.color : 'rgba(148, 163, 184, 0.18)',
                      boxShadow: p.amp > 0 ? `0 0 8px ${p.color}40` : 'none',
                    }}
                  />
                  <span className="text-[8px] font-mono text-slate-300 text-center whitespace-nowrap">
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Summed Waveform Preview */}
        <div className="md:col-span-6 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-b border-slate-800/60 pb-1">
            <span>Combined Air-Pressure Wave (2 Cycles)</span>
            <span className="text-emerald-400 font-bold">
              {customPartials ? 'Custom Timbre' : activePreset.category}
            </span>
          </div>

          <div className="relative w-full flex justify-center py-1">
            <svg viewBox={`0 0 ${waveWidth} ${waveHeight}`} className="w-full h-24 overflow-visible">
              <line x1={0} y1={waveMidY} x2={waveWidth} y2={waveMidY} stroke="rgba(255, 255, 255, 0.15)" strokeWidth={1} />
              <line x1={waveWidth / 2} y1={4} x2={waveWidth / 2} y2={waveHeight - 4} stroke="rgba(225, 54, 16, 0.4)" strokeDasharray="2 2" strokeWidth={1} />
              <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Dual Perception Cards + Live Launch */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs items-center">
        <div className="sm:col-span-5 bg-slate-900/90 p-2.5 rounded-lg border border-blue-900/40 space-y-1">
          <div className="font-semibold text-blue-400 flex items-center gap-1.5 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Slowed Down (Amplitude = Accent Weight)</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            {customPartials
              ? `Your ${activeCount} active bars play as ${activeCount} layered drum subdivisions—bar height sets how hard each subdivision hits.`
              : activePreset.rhythmDescription}
          </p>
        </div>

        <div className="sm:col-span-4 bg-slate-900/90 p-2.5 rounded-lg border border-purple-900/40 space-y-1">
          <div className="font-semibold text-purple-400 flex items-center gap-1.5 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>Sped Up (Amplitude = Tone Colour)</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            {customPartials
              ? `Your custom harmonic amplitudes fuse into a bespoke instrument tone colour.`
              : activePreset.pitchDescription}
          </p>
        </div>

        <div className="sm:col-span-3 flex justify-end">
          {onPlayDemo && (
            <button
              onClick={handleLaunchLive}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold text-[11px] transition cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current shrink-0" />
              <span>{customPartials ? 'Hear Custom Mix Live' : `Hear ${activePreset.shortName} Live`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
