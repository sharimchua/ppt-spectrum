import React, { useState } from 'react';
import { FilterCondition, FilterReference } from '../../core/filter-types';
import {
  STARTER_FILTERS,
  createBandPassCondition,
  createLowPassCondition,
  createHighPassCondition,
  createJustTo12TetCondition,
  createOddHarmonicsCondition,
  createPrimeLimitCondition,
  createEuclideanCycleCondition,
  createGridCycleCondition,
} from '../../core/filter-presets';
import { Filter } from '../../core/types';

interface PresetPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStarter: (filter: Filter) => void;
  onAddCondition: (condition: FilterCondition) => void;
}

type TabType = 'starters' | 'spectral' | 'interval' | 'harmonic' | 'cycle';

export const PresetPicker: React.FC<PresetPickerProps> = ({
  isOpen,
  onClose,
  onSelectStarter,
  onAddCondition,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('starters');
  const [selectedReference, setSelectedReference] = useState<FilterReference>('scene');

  if (!isOpen) return null;

  const handleCreateSpectral = (type: 'band' | 'low' | 'high') => {
    const id = `cond-${type}-${Date.now()}`;
    let cond: FilterCondition;
    if (type === 'band') cond = createBandPassCondition(selectedReference, 0, 4, 1, id);
    else if (type === 'low') cond = createLowPassCondition(selectedReference, 0, 1, id);
    else cond = createHighPassCondition(selectedReference, 0, 1, id);

    onAddCondition(cond);
    onClose();
  };

  const handleCreateInterval = (interval: 'm3' | 'M3' | 'P4' | 'P5' | 'M6' | 'm7') => {
    const id = `cond-interval-${interval}-${Date.now()}`;
    const cond = createJustTo12TetCondition(interval, selectedReference, id);
    onAddCondition(cond);
    onClose();
  };

  const handleCreateHarmonic = (type: 'odd' | 'limit5' | 'limit7' | 'limit11') => {
    const id = `cond-harm-${type}-${Date.now()}`;
    let cond: FilterCondition;
    if (type === 'odd') cond = createOddHarmonicsCondition(31, id);
    else if (type === 'limit5') cond = createPrimeLimitCondition(5, id);
    else if (type === 'limit7') cond = createPrimeLimitCondition(7, id);
    else cond = createPrimeLimitCondition(11, id);

    onAddCondition(cond);
    onClose();
  };

  const handleCreateCycle = (type: 'tresillo' | 'cinquillo' | 'backbeat' | 'downbeat' | 'grid3' | 'grid5') => {
    const id = `cond-cycle-${type}-${Date.now()}`;
    let cond: FilterCondition;
    if (type === 'tresillo') cond = createEuclideanCycleCondition(3, 8, 0, id);
    else if (type === 'cinquillo') cond = createEuclideanCycleCondition(5, 8, 0, id);
    else if (type === 'backbeat') cond = {
      kind: 'cycle',
      id,
      divisions: 4,
      slotWeights: [0, 1, 0, 1],
      rotation: 0,
      tolerance: 0.15,
      offGridMatch: 0.0,
      supercycle: null,
    };
    else if (type === 'downbeat') cond = {
      kind: 'cycle',
      id,
      divisions: 1,
      slotWeights: [1],
      rotation: 0,
      tolerance: 0.25,
      offGridMatch: 0.0,
      supercycle: null,
    };
    else if (type === 'grid3') cond = createGridCycleCondition(3, 0.0, id);
    else cond = createGridCycleCondition(5, 0.0, id);

    onAddCondition(cond);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <h2 className="text-sm font-bold text-slate-100">Filter Presets & Conditions</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 pt-2 border-b border-slate-800/80 gap-1 bg-slate-950/20 overflow-x-auto">
          {(['starters', 'spectral', 'interval', 'harmonic', 'cycle'] as TabType[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-mono capitalize transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab
                  ? 'border-sky-400 text-sky-300 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'starters' ? '★ Starters' : tab}
            </button>
          ))}
        </div>

        {/* Reference Selector for Range Conditions */}
        {(activeTab === 'spectral' || activeTab === 'interval' || activeTab === 'harmonic') && (
          <div className="flex items-center justify-between px-4 py-2 bg-slate-950/60 border-b border-slate-800/60 text-xs">
            <span className="text-[11px] text-slate-400">Anchor Coordinate:</span>
            <div className="flex items-center gap-1">
              {(['scene', 'anchor', 'absolute'] as FilterReference[]).map((ref) => (
                <button
                  key={ref}
                  type="button"
                  onClick={() => setSelectedReference(ref)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors ${
                    selectedReference === ref
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {ref}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
          {activeTab === 'starters' && (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] text-slate-400 font-mono">
                Replaces entire active filter with a ready-to-use reductive configuration:
              </span>
              {STARTER_FILTERS.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    onSelectStarter(s.build());
                    onClose();
                  }}
                  className="flex flex-col p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-800/40 cursor-pointer transition-all"
                >
                  <span className="text-xs font-bold text-sky-300 font-mono">{s.name}</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">{s.description}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'spectral' && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleCreateSpectral('band')}
                className="flex flex-col p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-sky-500/50 text-left transition-all"
              >
                <span className="text-xs font-bold text-sky-300 font-mono">Band-Pass Aperture</span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Raised-cosine resonant formant window isolating a frequency region
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleCreateSpectral('low')}
                className="flex flex-col p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-sky-500/50 text-left transition-all"
              >
                <span className="text-xs font-bold text-sky-300 font-mono">Low-Pass Aperture</span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Attenuates higher-frequency overtones, retaining bass/sub-bass
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleCreateSpectral('high')}
                className="flex flex-col p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-sky-500/50 text-left transition-all"
              >
                <span className="text-xs font-bold text-sky-300 font-mono">High-Pass Aperture</span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Attenuates slow rhythmic fundamentals, passing upper shimmer
                </span>
              </button>
            </div>
          )}

          {activeTab === 'interval' && (
            <div className="flex flex-col gap-2">
              {[
                { id: 'M3', name: 'Major 3rd Window', desc: 'Captures 5/4 Just (386¢) through 12-TET M3 (400¢)' },
                { id: 'm3', name: 'Minor 3rd Window', desc: 'Captures 6/5 Just (315.6¢) through 12-TET m3 (300¢)' },
                { id: 'P4', name: 'Perfect 4th Window', desc: 'Captures 4/3 Just (498¢) through 12-TET P4 (500¢)' },
                { id: 'P5', name: 'Perfect 5th Window', desc: 'Captures 3/2 Just (702¢) through 12-TET P5 (700¢)' },
                { id: 'M6', name: 'Major 6th Window', desc: 'Captures 5/3 Just (884¢) through 12-TET M6 (900¢)' },
                { id: 'm7', name: 'Harmonic 7th Window', desc: 'Captures 7/4 Just (968.8¢) through 12-TET m7 (1000¢)' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleCreateInterval(item.id as 'm3' | 'M3' | 'P4' | 'P5' | 'M6' | 'm7')}
                  className="flex flex-col p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 text-left transition-all"
                >
                  <span className="text-xs font-bold text-emerald-300 font-mono">{item.name}</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">{item.desc}</span>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'harmonic' && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleCreateHarmonic('odd')}
                className="flex flex-col p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 text-left transition-all"
              >
                <span className="text-xs font-bold text-amber-300 font-mono">Odd Harmonics Only (Clarinet / Square)</span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Sieves harmonic overtones passing only 1x, 3x, 5x, 7x, 9x...
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleCreateHarmonic('limit5')}
                className="flex flex-col p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 text-left transition-all"
              >
                <span className="text-xs font-bold text-amber-300 font-mono">5-Limit Sieve</span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Retains strictly pure Just ratios factorable by 2, 3, and 5
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleCreateHarmonic('limit7')}
                className="flex flex-col p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 text-left transition-all"
              >
                <span className="text-xs font-bold text-amber-300 font-mono">7-Limit Sieve (Septimal Blues)</span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Includes 7/4 harmonic 7ths and septimal intervals
                </span>
              </button>
            </div>
          )}

          {activeTab === 'cycle' && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleCreateCycle('tresillo')}
                className="flex flex-col p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 text-left transition-all"
              >
                <span className="text-xs font-bold text-cyan-300 font-mono">Tresillo 3:8 (Cuban 3+3+2)</span>
                <span className="text-[11px] text-slate-400 mt-0.5">Euclidean rhythm [1, 0, 0, 1, 0, 0, 1, 0]</span>
              </button>
              <button
                type="button"
                onClick={() => handleCreateCycle('cinquillo')}
                className="flex flex-col p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 text-left transition-all"
              >
                <span className="text-xs font-bold text-cyan-300 font-mono">Cinquillo 5:8</span>
                <span className="text-[11px] text-slate-400 mt-0.5">Euclidean rhythm [1, 0, 1, 1, 0, 1, 1, 0]</span>
              </button>
              <button
                type="button"
                onClick={() => handleCreateCycle('backbeat')}
                className="flex flex-col p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 text-left transition-all"
              >
                <span className="text-xs font-bold text-cyan-300 font-mono">Backbeat 4-Grid [0, 1, 0, 1]</span>
                <span className="text-[11px] text-slate-400 mt-0.5">Hits on beats 2 and 4</span>
              </button>
              <button
                type="button"
                onClick={() => handleCreateCycle('grid3')}
                className="flex flex-col p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 text-left transition-all"
              >
                <span className="text-xs font-bold text-cyan-300 font-mono">Triple Grid (Triplet Sieve)</span>
                <span className="text-[11px] text-slate-400 mt-0.5">Subtractive sieve taming cross-rhythm clicks</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
