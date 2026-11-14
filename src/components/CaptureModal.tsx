import React, { useState, useRef, useCallback } from 'react';
import { Shape } from '../core/types';
import { RhythmCaptureTab } from './capture/RhythmCaptureTab';
import { PitchCaptureTab } from './capture/PitchCaptureTab';
import { X, Mic, Sparkles, Drum } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'rhythm' | 'pitch'>('rhythm');
  const stopActiveTabRef = useRef<() => void>(() => {});

  const registerStopHook = useCallback((stopFn: () => void) => {
    stopActiveTabRef.current = stopFn;
  }, []);

  if (!isOpen) return null;

  const handleClose = () => {
    stopActiveTabRef.current();
    onClose();
  };

  const handleTabSwitch = (nextTab: 'rhythm' | 'pitch') => {
    if (nextTab === activeTab) return;
    stopActiveTabRef.current();
    setActiveTab(nextTab);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-[#0c101a] p-5 sm:p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-red-500" />
            <h2 className="text-sm font-bold tracking-wide text-white uppercase">
              Capture Multi-Voice Rhythm &amp; 24-Partial Spectrum
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="my-4 flex gap-2">
          <button
            type="button"
            onClick={() => handleTabSwitch('rhythm')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold transition cursor-pointer ${
              activeTab === 'rhythm'
                ? 'border-red-500 bg-red-600/25 text-white'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Drum className="h-4 w-4" />
            <span>Mic Rhythm &amp; Onsets</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('pitch')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold transition cursor-pointer ${
              activeTab === 'pitch'
                ? 'border-purple-500 bg-purple-600/25 text-white'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="h-4 w-4" />
            <span>Peak-Attack Pitch &amp; Timbre</span>
          </button>
        </div>

        {activeTab === 'rhythm' ? (
          <RhythmCaptureTab
            tplHz={tplHz}
            onCaptureShape={onCaptureShape}
            onClose={onClose}
            registerStopHook={registerStopHook}
          />
        ) : (
          <PitchCaptureTab
            tplHz={tplHz}
            onCaptureShape={onCaptureShape}
            onClose={onClose}
            registerStopHook={registerStopHook}
          />
        )}
      </div>
    </div>
  );
};
