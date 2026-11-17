import React, { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Keyboard, Pause, Play, Sliders, Volume2, X } from 'lucide-react';
import {
  TutorialDemoConfig,
  getDemoRegime,
  resolveDemoNarration,
} from './info-modal/tutorial-demos';
import type { DemoQuickAction } from './hooks/useDemoSpotlight';

interface TutorialReturnToastProps {
  activeDemo: TutorialDemoConfig | null;
  isInfoOpen: boolean;
  isKeyboardOpen?: boolean;
  currentD?: number;
  isOscillating?: boolean;
  hasCompletedRoundTrip?: boolean;
  userTookControl?: boolean;
  isFilterEnabled?: boolean;
  overrideNarration?: string | null;
  quickAction?: DemoQuickAction | null;
  onToggleOscillate?: () => void;
  onReturnToTutorial: () => void;
  onDismiss: () => void;
}

export const TutorialReturnToast: React.FC<TutorialReturnToastProps> = ({
  activeDemo,
  isInfoOpen,
  isKeyboardOpen = false,
  currentD = 0,
  isOscillating = false,
  hasCompletedRoundTrip = false,
  userTookControl = false,
  isFilterEnabled = false,
  overrideNarration = null,
  quickAction = null,
  onToggleOscillate,
  onReturnToTutorial,
  onDismiss,
}) => {
  const [isMinimised, setIsMinimised] = useState(false);

  useEffect(() => {
    if (!activeDemo) {
      setIsMinimised(false);
      return;
    }
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    setIsMinimised(Boolean(isMobile && (isKeyboardOpen || activeDemo.requiresKeyboard)));
  }, [activeDemo, isKeyboardOpen]);

  if (!activeDemo || isInfoOpen) return null;

  const badgeLabel = 'Guided Demo';

  const regime = getDemoRegime(currentD);
  const narrationText =
    overrideNarration ??
    resolveDemoNarration({
      demo: activeDemo,
      regime,
      hasCompletedRoundTrip,
      userTookControl,
      isFilterEnabled,
    });
  const showSweepToggle = activeDemo.mode === 'sweep' && Boolean(onToggleOscillate);

  if (isMinimised) {
    return (
      <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100%-1rem)] pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-150">
        <div className="flex items-center gap-1 sm:gap-1.5 rounded-full border border-amber-500/40 bg-[#0b0f19]/95 backdrop-blur-md pl-2.5 pr-1.5 py-1 shadow-[0_8px_24px_rgba(0,0,0,0.65)] ring-1 ring-amber-400/20">
          <button
            type="button"
            onClick={() => setIsMinimised(false)}
            className="flex items-center gap-1.5 min-w-0 text-left cursor-pointer group"
            title="Expand tutorial banner"
            aria-label="Expand tutorial banner"
          >
            {activeDemo.requiresKeyboard ? (
              <Keyboard className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 shrink-0 text-amber-300 animate-pulse" />
            )}
            <span className="text-[11px] font-semibold text-stone-100 truncate max-w-[115px] sm:max-w-[220px] group-hover:text-amber-200 transition">
              {activeDemo.shortTitle || activeDemo.title}
            </span>
            <ChevronUp className="h-3.5 w-3.5 shrink-0 text-stone-400 group-hover:text-white transition" />
          </button>

          <button
            type="button"
            onClick={onReturnToTutorial}
            className="inline-flex items-center gap-1 rounded-full bg-amber-500 hover:bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-stone-950 transition cursor-pointer shrink-0"
            title="Back to Guide"
          >
            <BookOpen className="h-3 w-3" />
            <span>Guide</span>
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full p-1 text-stone-400 hover:bg-stone-800 hover:text-stone-200 transition cursor-pointer shrink-0"
            title="Dismiss tutorial banner"
            aria-label="Dismiss tutorial banner"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1rem)] sm:w-[calc(100%-1.5rem)] max-w-2xl pointer-events-auto animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="rounded-xl border border-amber-500/40 bg-[#0b0f19]/95 backdrop-blur-md px-3.5 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.65)] ring-1 ring-amber-400/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Left: Active Demo Info & Listen Hint */}
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300">
              {activeDemo.requiresKeyboard ? (
                <Keyboard className="h-3.5 w-3.5 text-cyan-300" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 animate-pulse" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                  {badgeLabel}
                </span>
                {activeDemo.requiresKeyboard && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-semibold">
                    Keyboard Active
                  </span>
                )}
                <span className="text-xs font-bold text-stone-100 truncate">
                  {activeDemo.title}
                </span>
                <span className="hidden md:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-900 text-cyan-300 border border-stone-800">
                  {activeDemo.badge}
                </span>
              </div>
              <p className="text-[11px] text-stone-300 leading-snug mt-1">
                {narrationText}
              </p>
            </div>
          </div>

          {/* Right: Quick Action, Pause/Resume Sweep, Back to Guide, Minimise & Dismiss */}
          <div className="flex items-center justify-end gap-1.5 shrink-0 border-t sm:border-t-0 border-stone-800/80 pt-2 sm:pt-0">
            {quickAction && (
              <button
                type="button"
                onClick={quickAction.onClick}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition cursor-pointer ${
                  quickAction.isActive
                    ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                    : 'border-stone-700/80 bg-stone-900/90 text-stone-200 hover:bg-stone-800'
                }`}
              >
                <Sliders className="h-3 w-3" />
                <span>{quickAction.label}</span>
              </button>
            )}
            {showSweepToggle && (
              <button
                type="button"
                onClick={onToggleOscillate}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition cursor-pointer ${
                  isOscillating
                    ? 'border-stone-700/80 bg-stone-900/90 text-stone-200 hover:bg-stone-800'
                    : 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25'
                }`}
                title={isOscillating ? 'Pause sweep at current position' : 'Resume sweep from current position'}
              >
                {isOscillating ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 fill-current" />}
                <span>{isOscillating ? 'Pause' : 'Resume'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onReturnToTutorial}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-bold text-stone-950 shadow-sm transition cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Back to Guide</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMinimised(true)}
              className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 hover:text-stone-200 transition cursor-pointer"
              title="Minimise tutorial banner"
              aria-label="Minimise tutorial banner"
            >
              <ChevronDown className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 hover:text-stone-200 transition cursor-pointer"
              title="Dismiss tutorial banner"
              aria-label="Dismiss tutorial banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
