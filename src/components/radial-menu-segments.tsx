import React from 'react';
import {
  Play,
  Pause,
  Repeat,
  SlidersHorizontal,
  Settings,
  Filter,
  Radio,
  Bookmark,
  ArrowLeft,
  Sliders,
} from 'lucide-react';
import { Scene } from '../core/types';
import { BookmarkSettings } from './bookmarks-storage';
import { FilterControlParam } from './hooks/useFilters';

export interface RadialWedgeSegment {
  id: string;
  startDeg: number;
  endDeg: number;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  accentHex: string;
  fillRgba: string;
  activeFillRgba: string;
  isActive?: boolean;
  onSelect: () => void;
}

export interface BuildRadialSegmentsOptions {
  activeSubMenu: 'none' | 'north' | 'east' | 'west';
  scene: Scene;
  isPlaying: boolean;
  isOscillating: boolean;
  currentD: number;
  bookmarks: BookmarkSettings;
  onSelectSubMenu: (sub: 'none' | 'north' | 'east' | 'west') => void;
  onOpenLibrary: () => void;
  onOpenCapture: () => void;
  onOpenSettings: () => void;
  onOpenFilters?: () => void;
  onTogglePlay: () => void;
  onToggleOscillate: () => void;
  onJumpBookmarkA: () => void;
  onJumpBookmarkB: () => void;
  onSetBookmarkA: () => void;
  onSetBookmarkB: () => void;
  onToggleFilter: () => void;
  onCycleFilterMode: () => void;
  onEnterFilterEditMode?: (param?: FilterControlParam) => void;
  onClose: () => void;
}

export function buildRadialSegments(opts: BuildRadialSegmentsOptions): RadialWedgeSegment[] {
  const {
    activeSubMenu,
    scene,
    isPlaying,
    isOscillating,
    currentD,
    bookmarks,
    onSelectSubMenu,
    onOpenLibrary,
    onOpenCapture,
    onOpenSettings,
    onOpenFilters,
    onTogglePlay,
    onToggleOscillate,
    onJumpBookmarkA,
    onJumpBookmarkB,
    onSetBookmarkA,
    onSetBookmarkB,
    onToggleFilter,
    onCycleFilterMode,
    onEnterFilterEditMode,
    onClose,
  } = opts;

  const activePlacement = scene.placements[0];
  const activeShape = scene.shapes.find((s) => s.id === activePlacement?.shapeId);
  const filter = scene.filter;

  if (activeSubMenu === 'none') {
    const filterSub = filter?.enabled
      ? `${filter.action === 'remove' ? 'REJECT' : 'PASS'} (${filter.conditions.length})`
      : 'BYPASS';

    return [
      {
        id: 'north-lib-mic',
        startDeg: -135,
        endDeg: -45,
        title: 'LIBRARY & MIC',
        subtitle: activeShape ? activeShape.name : 'Shapes • Sample',
        icon: (
          <div className="flex items-center gap-1">
            <SlidersHorizontal className="w-4 h-4 text-red-400" />
            <Radio className="w-3.5 h-3.5 text-amber-400" />
          </div>
        ),
        accentHex: '#ef4444',
        fillRgba: 'rgba(30, 18, 28, 0.92)',
        activeFillRgba: 'rgba(225, 54, 16, 0.35)',
        onSelect: () => onSelectSubMenu('north'),
      },
      {
        id: 'east-playback',
        startDeg: -45,
        endDeg: 45,
        title: 'PLAYBACK ►',
        subtitle: isPlaying ? 'Playing • A/B' : 'Play • A/B • Sweep',
        icon: isPlaying ? (
          <Pause className="w-4 h-4 text-emerald-400" />
        ) : (
          <Play className="w-4 h-4 text-emerald-400 fill-current" />
        ),
        accentHex: '#10b981',
        fillRgba: 'rgba(14, 28, 30, 0.92)',
        activeFillRgba: 'rgba(16, 185, 129, 0.35)',
        isActive: isPlaying || isOscillating,
        onSelect: () => onSelectSubMenu('east'),
      },
      {
        id: 'south-settings',
        startDeg: 45,
        endDeg: 135,
        title: 'SETTINGS',
        subtitle: 'Audio • Visuals',
        icon: <Settings className="w-4 h-4 text-purple-400" />,
        accentHex: '#a855f7',
        fillRgba: 'rgba(24, 18, 38, 0.92)',
        activeFillRgba: 'rgba(168, 85, 247, 0.35)',
        onSelect: () => {
          onOpenSettings();
          onClose();
        },
      },
      {
        id: 'west-filter',
        startDeg: 135,
        endDeg: 225,
        title: '◄ FILTERS',
        subtitle: filterSub,
        icon: <Filter className="w-4 h-4 text-sky-400" />,
        accentHex: '#38bdf8',
        fillRgba: 'rgba(14, 24, 38, 0.92)',
        activeFillRgba: 'rgba(56, 189, 248, 0.35)',
        isActive: Boolean(filter?.enabled),
        onSelect: () => onSelectSubMenu('west'),
      },
    ];
  }

  if (activeSubMenu === 'north') {
    return [
      {
        id: 'sub-shape-library',
        startDeg: -150,
        endDeg: -30,
        title: 'SHAPE LIBRARY',
        subtitle: 'Presets & Synth',
        icon: <SlidersHorizontal className="w-4 h-4 text-red-400" />,
        accentHex: '#ef4444',
        fillRgba: 'rgba(36, 18, 26, 0.94)',
        activeFillRgba: 'rgba(239, 68, 68, 0.4)',
        onSelect: () => {
          onOpenLibrary();
          onClose();
        },
      },
      {
        id: 'sub-mic-sampling',
        startDeg: -30,
        endDeg: 90,
        title: 'MIC SAMPLING',
        subtitle: 'Pitch & Rhythm',
        icon: <Radio className="w-4 h-4 text-amber-400" />,
        accentHex: '#f59e0b',
        fillRgba: 'rgba(34, 24, 16, 0.94)',
        activeFillRgba: 'rgba(245, 158, 11, 0.4)',
        onSelect: () => {
          onOpenCapture();
          onClose();
        },
      },
      {
        id: 'sub-north-back',
        startDeg: 90,
        endDeg: 210,
        title: '◄ BACK',
        subtitle: 'Main Compass',
        icon: <ArrowLeft className="w-4 h-4 text-slate-300" />,
        accentHex: '#94a3b8',
        fillRgba: 'rgba(20, 26, 38, 0.94)',
        activeFillRgba: 'rgba(148, 163, 184, 0.35)',
        onSelect: () => onSelectSubMenu('none'),
      },
    ];
  }

  if (activeSubMenu === 'east') {
    // 6 wedges: 60 deg each (-180 to 180 or -150 to 210)
    return [
      {
        id: 'sub-play-pause',
        startDeg: -150,
        endDeg: -90,
        title: isPlaying ? 'PAUSE' : 'PLAY',
        subtitle: isPlaying ? 'Stop Audio' : 'Start Synthesis',
        icon: isPlaying ? <Pause className="w-4 h-4 text-red-300" /> : <Play className="w-4 h-4 text-emerald-400 fill-current" />,
        accentHex: isPlaying ? '#ef4444' : '#10b981',
        fillRgba: isPlaying ? 'rgba(42, 16, 20, 0.94)' : 'rgba(14, 32, 28, 0.94)',
        activeFillRgba: isPlaying ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)',
        isActive: isPlaying,
        onSelect: () => onTogglePlay(),
      },
      {
        id: 'sub-goto-a',
        startDeg: -90,
        endDeg: -30,
        title: 'GO TO A',
        subtitle: bookmarks.a.label,
        icon: <Bookmark className="w-4 h-4 text-cyan-400 fill-current" />,
        accentHex: '#22d3ee',
        fillRgba: 'rgba(14, 28, 38, 0.94)',
        activeFillRgba: 'rgba(34, 211, 238, 0.4)',
        onSelect: () => {
          onJumpBookmarkA();
          onClose();
        },
      },
      {
        id: 'sub-goto-b',
        startDeg: -30,
        endDeg: 30,
        title: 'GO TO B',
        subtitle: bookmarks.b.label,
        icon: <Bookmark className="w-4 h-4 text-amber-400 fill-current" />,
        accentHex: '#f59e0b',
        fillRgba: 'rgba(34, 26, 14, 0.94)',
        activeFillRgba: 'rgba(245, 158, 11, 0.4)',
        onSelect: () => {
          onJumpBookmarkB();
          onClose();
        },
      },
      {
        id: 'sub-sweep',
        startDeg: 30,
        endDeg: 90,
        title: isOscillating ? 'STOP SWEEP' : 'SWEEP A↔B',
        subtitle: isOscillating ? 'Active' : 'Oscillate',
        icon: <Repeat className={`w-4 h-4 text-red-400 ${isOscillating ? 'animate-spin' : ''}`} />,
        accentHex: '#ef4444',
        fillRgba: 'rgba(34, 18, 24, 0.94)',
        activeFillRgba: 'rgba(239, 68, 68, 0.4)',
        isActive: isOscillating,
        onSelect: () => onToggleOscillate(),
      },
      {
        id: 'sub-set-a',
        startDeg: 90,
        endDeg: 150,
        title: 'SET A',
        subtitle: `d = ${currentD.toFixed(2)}`,
        icon: <Bookmark className="w-4 h-4 text-cyan-400" />,
        accentHex: '#22d3ee',
        fillRgba: 'rgba(14, 28, 38, 0.94)',
        activeFillRgba: 'rgba(34, 211, 238, 0.4)',
        onSelect: () => onSetBookmarkA(),
      },
      {
        id: 'sub-set-b',
        startDeg: 150,
        endDeg: 210,
        title: 'SET B',
        subtitle: `d = ${currentD.toFixed(2)}`,
        icon: <Bookmark className="w-4 h-4 text-amber-400" />,
        accentHex: '#f59e0b',
        fillRgba: 'rgba(34, 24, 14, 0.94)',
        activeFillRgba: 'rgba(245, 158, 11, 0.4)',
        onSelect: () => onSetBookmarkB(),
      },
    ];
  }

  // West: Dedicated Filters Menu
  return [
    {
      id: 'sub-filters-open',
      startDeg: -135,
      endDeg: -45,
      title: 'OPEN FILTERS',
      subtitle: 'Conditions & Presets',
      icon: <Filter className="w-4 h-4 text-sky-400" />,
      accentHex: '#38bdf8',
      fillRgba: 'rgba(14, 26, 40, 0.94)',
      activeFillRgba: 'rgba(56, 189, 248, 0.4)',
      onSelect: () => {
        if (onOpenFilters) onOpenFilters();
        onClose();
      },
    },
    {
      id: 'sub-filter-bypass',
      startDeg: -45,
      endDeg: 45,
      title: filter?.enabled ? 'BYPASS FILTER' : 'ACTIVATE FILTER',
      subtitle: filter?.enabled ? 'Mute filter effect' : 'Enable processing',
      icon: <Filter className="w-4 h-4 text-sky-400" />,
      accentHex: '#38bdf8',
      fillRgba: 'rgba(14, 26, 40, 0.94)',
      activeFillRgba: 'rgba(56, 189, 248, 0.4)',
      isActive: Boolean(filter?.enabled),
      onSelect: () => onToggleFilter(),
    },
    {
      id: 'sub-filter-edit',
      startDeg: 45,
      endDeg: 135,
      title: 'SCRUB ON CELLS',
      subtitle: 'Canvas gesture edit',
      icon: <Sliders className="w-4 h-4 text-sky-300" />,
      accentHex: '#38bdf8',
      fillRgba: 'rgba(12, 34, 52, 0.95)',
      activeFillRgba: 'rgba(56, 189, 248, 0.45)',
      onSelect: () => {
        if (!filter?.enabled) onToggleFilter();
        if (onEnterFilterEditMode) onEnterFilterEditMode('centre');
        onClose();
      },
    },
    {
      id: 'sub-filter-preset',
      startDeg: 135,
      endDeg: 225,
      title: 'CYCLE PRESET',
      subtitle: 'Next spectral aperture',
      icon: <Repeat className="w-4 h-4 text-sky-400" />,
      accentHex: '#38bdf8',
      fillRgba: 'rgba(14, 26, 40, 0.94)',
      activeFillRgba: 'rgba(56, 189, 248, 0.4)',
      onSelect: () => onCycleFilterMode(),
    },
  ];
}
