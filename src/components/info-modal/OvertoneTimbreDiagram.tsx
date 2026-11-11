import React, { useState } from 'react';

interface TimbrePreset {
  id: string;
  name: string;
  category: string;
  partials: { ratioVal: number; amp: number; label: string; color: string }[];
  rhythmDescription: string;
  pitchDescription: string;
}

const TIMBRE_PRESETS: TimbrePreset[] = [
  {
    id: 'sine',
    name: 'Sine Wave (Pure Tone)',
    category: 'Elementary',
    partials: [
      { ratioVal: 1, amp: 1.0, label: '1x Fund', color: '#FF4D4D' },
    ],
    rhythmDescription: 'A single, unadorned metronome pulse repeating once per cycle.',
    pitchDescription: 'Pure fundamental frequency with zero harmonic coloration (flute, tuning fork).',
  },
  {
    id: 'sawtooth',
    name: 'Sawtooth (All Integers 1/k)',
    category: 'Harmonic Rich',
    partials: [
      { ratioVal: 1, amp: 1.0, label: '1x', color: '#FF4D4D' },
      { ratioVal: 2, amp: 0.5, label: '2x', color: '#FB923C' },
      { ratioVal: 3, amp: 0.33, label: '3x', color: '#60A5FA' },
      { ratioVal: 4, amp: 0.25, label: '4x', color: '#FB923C' },
      { ratioVal: 5, amp: 0.2, label: '5x', color: '#FDE047' },
      { ratioVal: 6, amp: 0.17, label: '6x', color: '#60A5FA' },
      { ratioVal: 7, amp: 0.14, label: '7x', color: '#F472B6' },
      { ratioVal: 8, amp: 0.12, label: '8x', color: '#FB923C' },
    ],
    rhythmDescription: 'Hierarchical polyrhythmic stack where all integer pulses align onto a sharp downbeat.',
    pitchDescription: 'Bright, buzzing timbre rich in even and odd harmonics (bowed violin, acoustic brass).',
  },
  {
    id: 'square',
    name: 'Square Wave (Odd Integers)',
    category: 'Odd-Prime Hollow',
    partials: [
      { ratioVal: 1, amp: 1.0, label: '1x', color: '#FF4D4D' },
      { ratioVal: 3, amp: 0.33, label: '3x', color: '#60A5FA' },
      { ratioVal: 5, amp: 0.2, label: '5x', color: '#FDE047' },
      { ratioVal: 7, amp: 0.14, label: '7x', color: '#F472B6' },
    ],
    rhythmDescription: 'Odd-tuplet cross-rhythm (triplets & quintuplets) with no duple backbeats.',
    pitchDescription: 'Hollow, woody resonance produced by odd-harmonic dominance (clarinet, pan flute).',
  },
  {
    id: 'bell',
    name: 'Church Bell (Inharmonic Modes)',
    category: 'Inharmonic Idiophone',
    partials: [
      { ratioVal: 0.50, amp: 0.85, label: '0.5x', color: '#38bdf8' },
      { ratioVal: 1.00, amp: 1.0, label: '1.0x', color: '#FF4D4D' },
      { ratioVal: 1.18, amp: 0.75, label: '1.2x', color: '#FDE047' },
      { ratioVal: 1.51, amp: 0.60, label: '1.5x', color: '#60A5FA' },
      { ratioVal: 2.01, amp: 0.80, label: '2.0x', color: '#C084FC' },
    ],
    rhythmDescription: 'Aperiodic, non-repeating cross-taps that drift continuously and never lock onto a short bar.',
    pitchDescription: 'Metallic chime with slow, hypnotic acoustic beating and a minor-third tierce overtone.',
  },
];

export const OvertoneTimbreDiagram: React.FC = () => {
  const [activePresetId, setActivePresetId] = useState<string>('sawtooth');
  const activePreset = TIMBRE_PRESETS.find((p) => p.id === activePresetId) || TIMBRE_PRESETS[1];

  // Synthesise time-domain waveform coordinates from the active partials
  const wavePoints = 120;
  const waveWidth = 260;
  const waveHeight = 70;
  const waveMidY = 35;

  const pathD = (() => {
    let dStr = '';
    const totalAmp = activePreset.partials.reduce((sum, p) => sum + p.amp, 0) || 1;

    for (let i = 0; i <= wavePoints; i++) {
      const t = (i / wavePoints) * 2.0; // Draw 2 complete fundamental cycles
      let yVal = 0;

      for (const p of activePreset.partials) {
        yVal += Math.cos(2 * Math.PI * t * p.ratioVal) * p.amp;
      }

      const normalizedY = (yVal / totalAmp) * (waveHeight * 0.42);
      const x = (i / wavePoints) * waveWidth;
      const y = waveMidY - normalizedY;

      dStr += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return dStr;
  })();

  return (
    <div className="w-full flex flex-col p-3.5 sm:p-4 bg-slate-950/80 border border-slate-800/90 rounded-xl select-none space-y-3.5 shadow-lg">
      {/* Header & Preset Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div>
          <span className="text-xs sm:text-sm font-bold text-white font-mono flex items-center gap-2">
            <span>Timbre as Micro-Polyphony &amp; The Rhythmic Mirror</span>
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            Partials in pitch space form instrument timbre; in rhythm space they form layered polyrhythmic accents.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1 self-start sm:self-auto">
          {TIMBRE_PRESETS.map((tp) => (
            <button
              key={tp.id}
              onClick={() => setActivePresetId(tp.id)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition cursor-pointer border ${
                activePresetId === tp.id
                  ? 'bg-red-950/90 border-red-500 text-white shadow-sm ring-1 ring-red-400/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              {tp.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Workspace: Partial Bars (Left) + Waveform (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Left: Partial Amplitude Spectrum Bars */}
        <div className="md:col-span-6 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-b border-slate-800/60 pb-1">
            <span>Harmonic Partials (Frequency &amp; Amplitude)</span>
            <span className="text-cyan-400 font-bold">{activePreset.partials.length} Partials</span>
          </div>

          <div className="flex items-end justify-between h-24 gap-1.5 pt-2 px-1">
            {activePreset.partials.map((p, idx) => {
              const barHeightPct = Math.max(12, Math.round(p.amp * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[8px] font-mono text-slate-300">{(p.amp).toFixed(2)}</span>
                  <div
                    className="w-full rounded-t transition-all duration-200"
                    style={{
                      height: `${barHeightPct}%`,
                      backgroundColor: p.color,
                      boxShadow: `0 0 8px ${p.color}40`,
                    }}
                  />
                  <span className="text-[8px] font-mono text-slate-300 text-center whitespace-nowrap">
                    {p.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Composite Waveform Preview */}
        <div className="md:col-span-6 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-b border-slate-800/60 pb-1">
            <span>Composite Summed Waveform (2 Cycles)</span>
            <span className="text-emerald-400 font-bold">{activePreset.category}</span>
          </div>

          <div className="relative w-full flex justify-center py-1">
            <svg viewBox={`0 0 ${waveWidth} ${waveHeight}`} className="w-full h-24 overflow-visible">
              {/* Centre baseline */}
              <line x1={0} y1={waveMidY} x2={waveWidth} y2={waveMidY} stroke="rgba(255, 255, 255, 0.15)" strokeWidth={1} />
              {/* Downbeat / Cycle dividing tick */}
              <line x1={waveWidth / 2} y1={4} x2={waveWidth / 2} y2={waveHeight - 4} stroke="rgba(225, 54, 16, 0.4)" strokeDasharray="2 2" strokeWidth={1} />
              {/* Summed Waveform Line */}
              <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Dual Perception Interpretation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-900/90 p-3 rounded-lg border border-blue-900/40 space-y-1">
          <div className="font-semibold text-blue-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Below TPL: In Rhythm Space (d &gt; 0)</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            {activePreset.rhythmDescription}
          </p>
        </div>

        <div className="bg-slate-900/90 p-3 rounded-lg border border-purple-900/40 space-y-1">
          <div className="font-semibold text-purple-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>Above TPL: In Pitch Space (d &lt; 0)</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            {activePreset.pitchDescription}
          </p>
        </div>
      </div>
    </div>
  );
};
