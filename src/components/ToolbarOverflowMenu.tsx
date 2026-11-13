/**
 * Responsive desktop overflow menu for ControlToolbar.
 * Surfaces secondary navigation and workspace actions collapsed at narrower desktop breakpoints.
 * Australian English spelling maintained.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRightLeft,
  Check,
  Compass,
  HelpCircle,
  Keyboard,
  Layers,
  LayoutGrid,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Package,
  Radio,
  Repeat,
  Settings,
  Share2,
} from 'lucide-react';
import { LayoutDefinition, PRESET_LAYOUTS } from '../core/layout-models';
import { MidiDeviceState } from '../audio/midi-manager';

export interface ToolbarOverflowMenuProps {
  currentLayoutId: string;
  customLayout?: LayoutDefinition | null;
  isEditMode?: boolean;
  isFullscreen?: boolean;
  isOscillating?: boolean;
  copiedLink?: boolean;
  midiState?: MidiDeviceState;
  onSelectLayout: (layout: LayoutDefinition) => void;
  onToggleOscillate?: () => void;
  onOpenBookmarks?: () => void;
  onOpenCapture: () => void;
  onToggleEditMode?: () => void;
  onShareClick?: () => void;
  onOpenBundles?: () => void;
  onOpenMidiModal?: () => void;
  onOpenInfo: () => void;
  onToggleSettings?: () => void;
  onToggleFullscreen?: () => void;
  onOpenRadialMenu?: () => void;
}

export const ToolbarOverflowMenu: React.FC<ToolbarOverflowMenuProps> = ({
  currentLayoutId,
  customLayout,
  isEditMode = false,
  isFullscreen = false,
  isOscillating = false,
  copiedLink = false,
  midiState,
  onSelectLayout,
  onToggleOscillate,
  onOpenBookmarks,
  onOpenCapture,
  onToggleEditMode,
  onShareClick,
  onOpenBundles,
  onOpenMidiModal,
  onOpenInfo,
  onToggleSettings,
  onToggleFullscreen,
  onOpenRadialMenu,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showLayouts, setShowLayouts] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const act = (fn?: () => void) => {
    fn?.();
    setIsOpen(false);
  };

  const hasBadge = Boolean(isOscillating || isEditMode || midiState?.isConnected);

  return (
    <div ref={containerRef} className="relative flex min-[1900px]:hidden items-center">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition cursor-pointer ${
          isOpen
            ? 'border-slate-500 bg-slate-700 text-white'
            : 'border-slate-700 bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700'
        }`}
        title="More Workspace & Studio Tools"
        aria-expanded={isOpen}
        aria-label="More Workspace & Studio Tools"
      >
        <MoreHorizontal className="w-4 h-4" />
        <span className="hidden lg:inline text-[11px]">More</span>
        {hasBadge && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-60 bg-[#0e1320] border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
          {onToggleOscillate && (
            <button
              type="button"
              onClick={() => act(onToggleOscillate)}
              className={`lg:hidden w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
                isOscillating ? 'bg-red-950/60 text-red-200 font-semibold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <Repeat className={`w-3.5 h-3.5 ${isOscillating ? 'animate-spin text-red-400' : 'text-slate-400'}`} />
                <span>{isOscillating ? 'Stop Sweep' : 'Sweep A↔B'}</span>
              </span>
              <kbd className="text-[10px] font-mono text-slate-500">S</kbd>
            </button>
          )}

          {onOpenBookmarks && (
            <button
              type="button"
              onClick={() => act(onOpenBookmarks)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
                <span>Bookmarks</span>
              </span>
              <kbd className="text-[10px] font-mono text-slate-500">M</kbd>
            </button>
          )}

          {onOpenBundles && (
            <button
              type="button"
              onClick={() => act(onOpenBundles)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-purple-400" />
                <span>Bundles &amp; Share</span>
              </span>
              <kbd className="text-[10px] font-mono text-slate-500">U</kbd>
            </button>
          )}

          <button
            type="button"
            onClick={() => act(onOpenCapture)}
            className="2xl:hidden w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-red-400" />
              <span>Mic &amp; Tap Sample</span>
            </span>
            <kbd className="text-[10px] font-mono text-slate-500">P</kbd>
          </button>

          {onOpenMidiModal && midiState?.permissionStatus !== 'unsupported' && (
            <button
              type="button"
              onClick={() => act(onOpenMidiModal)}
              className="2xl:hidden w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Keyboard className={`w-3.5 h-3.5 ${midiState?.isConnected ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>MIDI Keyboard</span>
              </span>
              {midiState?.isConnected && (
                <span className="text-[10px] font-mono text-emerald-400">{midiState.inputs.length} on</span>
              )}
            </button>
          )}

          <div className="my-1 border-t border-slate-800" />

          {/* Collapsible Layout Presets sub-list when Layout dropdown is hidden (< xl) */}
          <div className="xl:hidden">
            <button
              type="button"
              onClick={() => setShowLayouts((prev) => !prev)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Layout Presets</span>
              </span>
              <span className="text-[10px] font-mono text-purple-300 capitalize">
                {currentLayoutId.startsWith('custom') ? 'Custom' : currentLayoutId.replace('-', ' ')}
              </span>
            </button>
            {showLayouts && (
              <div className="pl-4 pr-1 py-1 space-y-0.5">
                {Object.values(PRESET_LAYOUTS).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => act(() => onSelectLayout(preset))}
                    className={`w-full flex items-center justify-between px-2 py-1 rounded text-left transition cursor-pointer ${
                      currentLayoutId === preset.id
                        ? 'bg-purple-950/70 text-purple-200 font-semibold'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span>{preset.name}</span>
                    {currentLayoutId === preset.id && <Check className="w-3 h-3 text-purple-400" />}
                  </button>
                ))}
                {customLayout && (
                  <button
                    type="button"
                    onClick={() => act(() => onSelectLayout(customLayout))}
                    className={`w-full flex items-center justify-between px-2 py-1 rounded text-left transition cursor-pointer ${
                      currentLayoutId.startsWith('custom')
                        ? 'bg-purple-950/70 text-purple-200 font-semibold'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{customLayout.name || 'Custom Layout'}</span>
                    {currentLayoutId.startsWith('custom') && <Check className="w-3 h-3 text-purple-400" />}
                  </button>
                )}
              </div>
            )}
          </div>

          {onToggleEditMode && (
            <button
              type="button"
              onClick={() => act(onToggleEditMode)}
              className={`xl:hidden w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
                isEditMode ? 'bg-purple-950/60 text-purple-200 font-semibold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
                <span>{isEditMode ? 'Exit Edit Layout' : 'Edit Layout'}</span>
              </span>
            </button>
          )}

          {onShareClick && (
            <button
              type="button"
              onClick={() => act(onShareClick)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedLink ? 'Layout Link Copied' : 'Share Layout Link'}</span>
              </span>
            </button>
          )}

          {onOpenRadialMenu && (
            <button
              type="button"
              onClick={() => act(onOpenRadialMenu)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-ppt-do" />
                <span>Radial Compass Menu</span>
              </span>
            </button>
          )}

          <div className="my-1 border-t border-slate-800" />

          <button
            type="button"
            onClick={() => act(onOpenInfo)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Theory Primer &amp; Help</span>
            </span>
          </button>

          {onToggleSettings && (
            <button
              type="button"
              onClick={() => act(onToggleSettings)}
              className="lg:hidden w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span>Settings &amp; Visuals</span>
              </span>
            </button>
          )}

          {onToggleFullscreen && (
            <button
              type="button"
              onClick={() => act(onToggleFullscreen)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-slate-400" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-400" />}
                <span>{isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</span>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
