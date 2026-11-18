/**
 * Dedicated Tuning & Rhythm Map studio window.
 * Uses FloatingStudioWindow (draggable floating panel on desktop, bottom sheet on mobile)
 * so users can tweak tunings live while watching the spectrum, CycleWheel, and keyboard update.
 */

import React from 'react';
import { Sliders } from 'lucide-react';
import { MidiNoteMappingResult, MidiTuningConfig } from '../core/midi-tuning';
import { FloatingStudioWindow } from './FloatingStudioWindow';
import { MidiTuningPanel } from './MidiTuningPanel';

export interface TuningModalProps {
  isOpen: boolean;
  onClose: () => void;
  midiTuning: MidiTuningConfig;
  onChangeTuning: (updater: MidiTuningConfig | ((prev: MidiTuningConfig) => MidiTuningConfig)) => void;
  currentFundamentalD: number;
  tuningA4Hz?: number;
  tplFrequencyHz?: number;
  onSetFundamentalD?: (d: number) => void;
  lastMapping: MidiNoteMappingResult | null;
  heldMappings: MidiNoteMappingResult[];
}

export const TuningModal: React.FC<TuningModalProps> = ({
  isOpen,
  onClose,
  midiTuning,
  onChangeTuning,
  currentFundamentalD,
  tuningA4Hz,
  tplFrequencyHz,
  onSetFundamentalD,
  lastMapping,
  heldMappings,
}) => {
  if (!isOpen) return null;

  const defaultX = typeof window !== 'undefined' ? Math.max(24, window.innerWidth - 500) : 720;

  return (
    <FloatingStudioWindow
      isOpen={isOpen}
      onClose={onClose}
      icon={<Sliders className="w-4 h-4 text-amber-400 shrink-0" />}
      title="Tuning & Rhythm Map"
      subtitle="Prime Family Interval Matrix Across Pitch & Rhythm Space"
      defaultPosition={{ x: defaultX, y: 70 }}
      desktopWidthClass="w-[440px] lg:w-[480px]"
      ariaLabel="Tuning & Rhythm Map"
    >
      <div className="p-4">
        <MidiTuningPanel
          midiTuning={midiTuning}
          onChangeTuning={onChangeTuning}
          currentFundamentalD={currentFundamentalD}
          tuningA4Hz={tuningA4Hz}
          tplFrequencyHz={tplFrequencyHz}
          onSetFundamentalD={onSetFundamentalD}
          lastMapping={lastMapping}
          heldMappings={heldMappings}
        />
      </div>
    </FloatingStudioWindow>
  );
};
