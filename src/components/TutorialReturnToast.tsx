import React from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Volume2, X } from 'lucide-react';
import { TutorialDemoConfig, FEATURED_TOUR_DEMOS } from './info-modal/tutorial-demos';

interface TutorialReturnToastProps {
  activeDemo: TutorialDemoConfig | null;
  isInfoOpen: boolean;
  onReturnToTutorial: () => void;
  onCycleDemo: (direction: -1 | 1) => void;
  onDismiss: () => void;
}

export const TutorialReturnToast: React.FC<TutorialReturnToastProps> = ({
  activeDemo,
  isInfoOpen,
  onReturnToTutorial,
  onCycleDemo,
  onDismiss,
}) => {
  if (!activeDemo || isInfoOpen) return null;

  const tourIndex = FEATURED_TOUR_DEMOS.findIndex((d) => d.id === activeDemo.id);
  const badgeLabel =
    tourIndex >= 0
      ? `Guided Demo ${tourIndex + 1}/${FEATURED_TOUR_DEMOS.length}`
      : 'Live Tutorial Preview';

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] max-w-2xl pointer-events-auto animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="rounded-xl border border-amber-500/40 bg-[#0b0f19]/95 backdrop-blur-md px-3.5 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.65)] ring-1 ring-amber-400/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Left: Active Demo Info & Listen Hint */}
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300">
              <Volume2 className="h-3.5 w-3.5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                  {badgeLabel}
                </span>
                <span className="text-xs font-bold text-stone-100 truncate">
                  {activeDemo.title}
                </span>
                <span className="hidden md:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-900 text-cyan-300 border border-stone-800">
                  {activeDemo.badge}
                </span>
              </div>
              <p className="text-[11px] text-stone-300 leading-snug mt-1">
                {activeDemo.listenHint}
              </p>
            </div>
          </div>

          {/* Right: Step Demos, Back to Tutorial & Dismiss */}
          <div className="flex items-center justify-end gap-1.5 shrink-0 border-t sm:border-t-0 border-stone-800/80 pt-2 sm:pt-0">
            <div className="flex items-center rounded-lg border border-stone-700/80 bg-stone-900/90 p-0.5">
              <button
                onClick={() => onCycleDemo(-1)}
                className="p-1 rounded hover:bg-stone-800 text-stone-300 hover:text-white transition cursor-pointer"
                title="Previous Guided Demo"
                aria-label="Previous Guided Demo"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-1.5 text-[10px] font-mono text-stone-400 select-none">
                Demo
              </span>
              <button
                onClick={() => onCycleDemo(1)}
                className="p-1 rounded hover:bg-stone-800 text-stone-300 hover:text-white transition cursor-pointer"
                title="Next Guided Demo"
                aria-label="Next Guided Demo"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              onClick={onReturnToTutorial}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-bold text-stone-950 shadow-sm transition cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Back to Guide</span>
            </button>

            <button
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
