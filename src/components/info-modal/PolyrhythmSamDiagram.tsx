import React, { useState } from 'react';
import { Eye, EyeOff, Play } from 'lucide-react';
import { TutorialDemoId } from './tutorial-demos';

interface RatioExample {
  id: string;
  label: string;
  rhythmName: string;
  pitchName: string;
  voices: { mult: number; name: string; color: string }[];
  explanation: string;
  demoId: TutorialDemoId;
}

const EXAMPLES: RatioExample[] = [
  {
    id: '3-2',
    label: '3 : 2',
    rhythmName: '3-against-2 Hemiola',
    pitchName: 'Perfect Fifth (Do → So · 702¢)',
    voices: [
      { mult: 2, name: '2 pulses / bar', color: '#38bdf8' },
      { mult: 3, name: '3 pulses / bar', color: '#fbbf24' },
    ],
    explanation:
      'Every 2 cycles of the lower voice and 3 cycles of the upper voice land together on Beat 1 (The Sam). Speed that up past 25.8 Hz and your ear hears a rock-solid Perfect Fifth.',
    demoId: 'hemiola-sweep',
  },
  {
    id: '4-3',
    label: '4 : 3',
    rhythmName: '4-against-3 Cross-Rhythm',
    pitchName: 'Perfect Fourth (Do → Fa · 498¢)',
    voices: [
      { mult: 3, name: '3 pulses / bar', color: '#38bdf8' },
      { mult: 4, name: '4 pulses / bar', color: '#34d399' },
    ],
    explanation:
      'A 4-against-3 cross-rhythm takes slightly longer to realign than 3:2, giving it a suspended forward pull in both drum grooves and musical chords.',
    demoId: 'polyrhythm-4-3-sweep',
  },
  {
    id: '5-4',
    label: '5 : 4',
    rhythmName: '5-against-4 Quintuplet Groove',
    pitchName: 'Just Major Third (Do → Mi · 386¢)',
    voices: [
      { mult: 4, name: '4 pulses / bar', color: '#38bdf8' },
      { mult: 5, name: '5 pulses / bar', color: '#f472b6' },
    ],
    explanation:
      'Introducing the prime number 5 creates a warm, expressive 5-against-4 groove at slow speeds—and the sweet, beatless Major Third of a choir or brass section at high speeds.',
    demoId: 'polyrhythm-5-4-sweep',
  },
  {
    id: '4-5-6',
    label: '4 : 5 : 6',
    rhythmName: '3-Way Polyrhythmic Lock',
    pitchName: 'Just Major Triad (Do–Mi–So)',
    voices: [
      { mult: 4, name: '4× Root (Do)', color: '#38bdf8' },
      { mult: 5, name: '5× Third (Mi)', color: '#f472b6' },
      { mult: 6, name: '6× Fifth (So)', color: '#fbbf24' },
    ],
    explanation:
      'Even when only 4×, 5×, and 6× are playing, they all converge together once every 1× macro-bar. Your brain automatically fills in that 1× "Ghost Root"!',
    demoId: 'triad-sweep',
  },
];

interface PolyrhythmSamDiagramProps {
  onPlayDemo?: (demoId: TutorialDemoId) => void;
}

export const PolyrhythmSamDiagram: React.FC<PolyrhythmSamDiagramProps> = ({ onPlayDemo }) => {
  const [selectedId, setSelectedId] = useState<string>('3-2');
  const [showGhostRoot, setShowGhostRoot] = useState<boolean>(true);

  const active = EXAMPLES.find((e) => e.id === selectedId) || EXAMPLES[0];

  return (
    <div className="w-full flex flex-col p-3.5 sm:p-4 bg-slate-950/85 border border-slate-800/90 rounded-xl select-none space-y-3.5 shadow-lg">
      {/* Header & Ratio Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div>
          <span className="text-xs sm:text-sm font-bold text-white font-mono">
            Polyrhythm = Harmony &amp; The Shared Downbeat (The Sam)
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            Pick a ratio below and see how separate pulse streams lock onto one shared cycle.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1 self-start sm:self-auto">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.id}
              onClick={() => setSelectedId(ex.id)}
              className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition cursor-pointer border ${
                selectedId === ex.id
                  ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pulse Alignment Tracks across 1 Cycle */}
      <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono border-b border-slate-800/60 pb-1.5">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
              BEAT 1 (THE SAM)
            </span>
            <span className="text-slate-400">All layers meet at the start &amp; end of 1 full cycle</span>
          </div>

          <button
            onClick={() => setShowGhostRoot((prev) => !prev)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold transition cursor-pointer ${
              showGhostRoot
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {showGhostRoot ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            <span>{showGhostRoot ? '1× Ghost Root Shown' : '1× Root Muted (Brain still feels it!)'}</span>
          </button>
        </div>

        <div className="space-y-2 pt-1">
          {/* Upper Voice Tracks */}
          {active.voices.map((v) => {
            const ticks = Array.from({ length: v.mult + 1 }, (_, i) => i / v.mult);
            return (
              <div key={v.mult} className="flex items-center gap-2 sm:gap-2.5">
                <span className="w-20 sm:w-24 text-[9px] sm:text-[10px] font-mono font-bold shrink-0" style={{ color: v.color }}>
                  {v.name}
                </span>
                <div className="relative flex-1 h-6 bg-slate-950/80 rounded border border-slate-800/80 flex items-center px-3">
                  <div className="relative w-full h-0.5 bg-slate-800">
                    {ticks.map((pos, idx) => {
                      const isSam = idx === 0 || idx === v.mult;
                      return (
                        <div
                          key={idx}
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full transition-all"
                          style={{
                            left: `${pos * 100}%`,
                            width: isSam ? '10px' : '7px',
                            height: isSam ? '10px' : '7px',
                            backgroundColor: isSam ? '#10b981' : v.color,
                            boxShadow: isSam ? '0 0 8px #10b981' : undefined,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {/* 1x Ghost Fundamental / Sam Reference Track */}
          <div className={`flex items-center gap-2 sm:gap-2.5 transition-opacity ${showGhostRoot ? 'opacity-100' : 'opacity-35'}`}>
            <span className="w-20 sm:w-24 text-[9px] sm:text-[10px] font-mono font-bold text-emerald-400 shrink-0">
              1× Ghost Root
            </span>
            <div className="relative flex-1 h-6 bg-emerald-950/20 rounded border border-dashed border-emerald-500/40 flex items-center px-3">
              <div className="relative w-full h-0.5 bg-emerald-500/30">
                {[0, 1].map((pos) => (
                  <div
                    key={pos}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950 shadow-[0_0_10px_#10b981]"
                    style={{ left: `${pos * 100}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dual Identity Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-lg border border-slate-800 text-xs">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60">
              In Rhythm: {active.rhythmName}
            </span>
            <span className="text-slate-500">↔</span>
            <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60">
              In Pitch: {active.pitchName}
            </span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">{active.explanation}</p>
        </div>

        {onPlayDemo && (
          <button
            onClick={() => onPlayDemo(active.demoId)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold text-[11px] shrink-0 self-start sm:self-center transition cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Hear {active.label} Live</span>
          </button>
        )}
      </div>
    </div>
  );
};
