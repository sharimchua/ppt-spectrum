import React from 'react';
import { Volume2 } from 'lucide-react';
import { Scene, CosmeticsConfig } from '../core/types';
import { MidiPhaseMode, MidiTuningConfig } from '../core/midi-tuning';

interface SettingsAudioSectionProps {
  scene: Scene;
  cosmetics: CosmeticsConfig;
  onUpdateScene: (updater: (prev: Scene) => Scene) => void;
  onUpdateCosmetics: (partial: Partial<CosmeticsConfig>) => void;
  midiTuning: MidiTuningConfig;
  onChangeTuning: (updater: MidiTuningConfig | ((prev: MidiTuningConfig) => MidiTuningConfig)) => void;
}

export const SettingsAudioSection: React.FC<SettingsAudioSectionProps> = ({
  scene,
  cosmetics,
  onUpdateScene,
  onUpdateCosmetics,
  midiTuning,
  onChangeTuning,
}) => (
  <section className="space-y-3">
    <div className="flex items-center gap-1.5 font-semibold text-slate-200 text-xs uppercase tracking-wider">
      <Volume2 className="w-4 h-4 text-emerald-400" />
      <span>Audio &amp; Real-time Focus</span>
    </div>

    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/70 space-y-3">
      {/* Master Gain */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-300">Master Volume:</span>
          <span className="font-mono text-emerald-300">{(scene.audio.masterGain * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={scene.audio.masterGain}
          onChange={(e) => {
            const gain = parseFloat(e.target.value);
            onUpdateScene((prev) => ({
              ...prev,
              audio: { ...prev.audio, masterGain: gain },
            }));
          }}
          className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
        />
      </div>

      {/* Small Speaker Assist */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <div className="font-medium text-slate-200 text-[11px]">Small-Speaker Assist</div>
          <div className="text-[9px] text-slate-400">Virtual bass harmonics reinforcement</div>
        </div>
        <input
          type="checkbox"
          checked={scene.audio.speakerAssist}
          onChange={(e) => {
            const checked = e.target.checked;
            onUpdateScene((prev) => ({
              ...prev,
              audio: { ...prev.audio, speakerAssist: checked },
            }));
          }}
          className="w-4 h-4 accent-emerald-500 cursor-pointer"
        />
      </div>

      {/* Real-time Focus Mode */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
        <div>
          <div className="font-medium text-slate-200 text-[11px]">Auto-Mute on Blur</div>
          <div className="text-[9px] text-slate-400">Silences audio when tab is backgrounded</div>
        </div>
        <input
          type="checkbox"
          checked={cosmetics.focusModeEnabled}
          onChange={(e) => onUpdateCosmetics({ focusModeEnabled: e.target.checked })}
          className="w-4 h-4 accent-emerald-500 cursor-pointer"
        />
      </div>

      {/* Rhythm Phase Alignment Mode */}
      <div className="pt-2 border-t border-slate-800 space-y-1.5">
        <div>
          <div className="font-medium text-slate-200 text-[11px]">Rhythm Phase Alignment</div>
          <div className="text-[9px] text-slate-400">
            {midiTuning.rhythmPhaseMode === 'sam-aligned'
              ? 'Voices join mid-cycle so periodic ratios lock at the Sam.'
              : 'Each key strike restarts its own cycle from phase 0.'}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1 bg-slate-950/80 border border-slate-800 rounded-md p-0.5">
          {(
            [
              { id: 'sam-aligned', label: 'Sam-Aligned' },
              { id: 'key-strike', label: 'Key-Strike' },
            ] as Array<{ id: MidiPhaseMode; label: string }>
          ).map((opt) => {
            const active = (midiTuning.rhythmPhaseMode ?? 'sam-aligned') === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeTuning((prev) => ({ ...prev, rhythmPhaseMode: opt.id }))}
                className={`py-1 rounded text-[10px] font-semibold transition cursor-pointer ${
                  active
                    ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/60'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  </section>
);
