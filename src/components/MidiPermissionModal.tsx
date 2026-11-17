/**
 * Web MIDI permission request modal.
 * Mirrors the ppt-visualiser MIDI permission dialogue with Australian English spelling.
 */

import React, { useEffect, useState } from 'react';
import { Keyboard, RefreshCw, Sliders, Unplug } from 'lucide-react';
import { midiManagerInstance, MidiDeviceState } from '../audio/midi-manager';
import { MidiNoteMappingResult, MidiTuningConfig } from '../core/midi-tuning';
import { MidiTuningPanel } from './MidiTuningPanel';

export interface MidiPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  midiTuning: MidiTuningConfig;
  onChangeTuning: (updater: MidiTuningConfig | ((prev: MidiTuningConfig) => MidiTuningConfig)) => void;
  currentFundamentalD: number;
  tplFrequencyHz?: number;
  lastMapping: MidiNoteMappingResult | null;
  heldMappings: MidiNoteMappingResult[];
}

type MidiModalTab = 'device' | 'tuning';

export const MidiPermissionModal: React.FC<MidiPermissionModalProps> = ({
  isOpen,
  onClose,
  midiTuning,
  onChangeTuning,
  currentFundamentalD,
  tplFrequencyHz,
  lastMapping,
  heldMappings,
}) => {
  const [midiState, setMidiState] = useState<MidiDeviceState>(midiManagerInstance.state);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastNote, setLastNote] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<MidiModalTab>('device');

  useEffect(() => {
    if (!isOpen) return;
    const unsub = midiManagerInstance.onStateChange(setMidiState);
    const unsubNote = midiManagerInstance.onNoteOn((midi) => setLastNote(midi));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      unsub();
      unsubNote();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const ok = await midiManagerInstance.requestAccess();
      if (ok && midiManagerInstance.state.inputs.length > 0) {
        onClose();
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    midiManagerInstance.disconnect();
    setLastNote(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="midi-modal-title"
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-700/60 flex items-center justify-center text-red-400 shadow-inner">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 id="midi-modal-title" className="text-lg font-semibold text-white tracking-wide">
                MIDI &amp; Tuning Map
              </h2>
              <p className="text-xs text-slate-400">Web MIDI &amp; Harmonic Profiler Mapping</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close dialogue"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('device')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'device'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>MIDI Device</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tuning')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'tuning'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Tuning &amp; Rhythm Map</span>
          </button>
        </div>

        {activeTab === 'tuning' ? (
          <MidiTuningPanel
            midiTuning={midiTuning}
            onChangeTuning={onChangeTuning}
            currentFundamentalD={currentFundamentalD}
            tplFrequencyHz={tplFrequencyHz}
            lastMapping={lastMapping}
            heldMappings={heldMappings}
          />
        ) : (
        <div className="text-sm text-slate-300 space-y-3 leading-relaxed">
          <p>
            To play and visualise shapes from your instrument, the app needs permission to listen to notes from your MIDI keyboard or controller.
          </p>
          <p className="text-xs text-slate-400 bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
            This app only reads incoming notes and velocities as you play them. It cannot alter anything on your instrument, install software, or modify device settings.
          </p>

          {midiState.isConnected && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-300">
                <span>Connected ({midiState.inputs.length} input{midiState.inputs.length === 1 ? '' : 's'})</span>
                <span className="text-[10px] font-mono text-emerald-400/90">
                  {lastNote !== null ? `Last MIDI note: ${lastNote}` : 'Press a key to test…'}
                </span>
              </div>
              <select
                value={midiState.selectedInputId}
                onChange={(e) => midiManagerInstance.selectInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none cursor-pointer"
                aria-label="Select MIDI Input Device"
              >
                <option value="all">All MIDI Inputs ({midiState.inputs.length})</option>
                {midiState.inputs.map((inp) => (
                  <option key={inp.id} value={inp.id}>
                    {inp.name}{inp.connection ? ` (${inp.connection})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400">
                On Windows, MIDI ports are single-client: if another browser (like Edge) or DAW is open with MIDI active, close it so this browser can receive notes.
              </p>
            </div>
          )}

          {!midiState.isConnected && midiState.isDisconnected && (
            <div className="text-xs text-slate-300 bg-slate-800/70 border border-slate-600/60 rounded-xl p-3">
              MIDI input is disconnected. Your MIDI keyboard will not change the frequency or trigger notes until you reconnect.
            </div>
          )}

          {!midiState.isConnected && !midiState.isDisconnected && midiState.permissionStatus === 'granted' && (
            <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-500/40 rounded-xl p-3">
              MIDI permission is granted, but no MIDI input devices were detected. Plug in or power on your keyboard and click Refresh.
            </div>
          )}

          {(midiState.permissionStatus === 'denied' || midiState.lastError) && (
            <div className="text-xs text-red-300 bg-red-950/40 border border-red-500/40 rounded-xl p-3">
              {midiState.lastError || 'MIDI permission was denied. Check your browser site permissions for MIDI devices.'}
            </div>
          )}

          {midiState.permissionStatus === 'prompt' && !midiState.lastError && (
            <p className="text-xs text-slate-400">
              Click <strong className="text-slate-200">Connect MIDI</strong> below, then choose <strong className="text-slate-200">Allow</strong> when your browser prompts you.
            </p>
          )}
        </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <button
            type="button"
            disabled={isConnecting}
            onClick={() => void handleConnect()}
            className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white rounded-xl font-medium text-sm transition shadow-lg shadow-red-950/40 text-center flex items-center justify-center gap-2 cursor-pointer"
          >
            {midiState.permissionStatus === 'granted' && !midiState.isDisconnected ? (
              <>
                <RefreshCw className={`w-4 h-4 ${isConnecting ? 'animate-spin' : ''}`} />
                <span>{isConnecting ? 'Scanning…' : 'Refresh MIDI Devices'}</span>
              </>
            ) : (
              <>
                <span>{isConnecting ? 'Connecting…' : 'Connect MIDI'}</span>
                <span>→</span>
              </>
            )}
          </button>
          {midiState.isConnected && (
            <button
              type="button"
              onClick={handleDisconnect}
              className="py-2.5 px-4 bg-slate-800 hover:bg-red-950/70 text-slate-200 hover:text-red-200 border border-slate-700 hover:border-red-700/60 rounded-xl font-medium text-sm transition text-center flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Unplug className="w-4 h-4" />
              <span>Disconnect</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-sm transition text-center cursor-pointer"
          >
            {midiState.isConnected ? 'Done' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};
