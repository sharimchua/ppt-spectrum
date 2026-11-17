/**
 * Keyboard shortcuts hook.
 *
 * Global Key Bindings:
 * - Spacebar: toggles simulation/audio playback (intercepted in capture phase so focused buttons/dropdowns don't steal it)
 * - 'l' / 'L': toggles Shape Library & Synthesiser tray
 * - Shift + 'L': opens Quick Shape Search Modal with autocomplete
 * - 's' / 'S': toggles continuum sweep oscillation
 * - 'e' / 'E': toggles band filter interactive edit mode HUD (and enables filter if disabled)
 * - 'f' / 'F': toggles filter bypass (Shift + 'F' opens Quick Filter Search Modal)
 * - 't' / 'T': triggers/strikes acoustic ADSR note (keydown on, keyup off)
 * - 'a' / 'A': jump fundamental to Bookmark A (Shift + A sets Bookmark A to current d with sparks)
 * - 'b' / 'B': jump fundamental to Bookmark B (Shift + B sets Bookmark B to current d with sparks)
 * - Left/Right arrows: step fundamental by 1 DuMetric octave (Shift + Left/Right steps by 0.5 octave)
 * - Up/Down arrows: navigate back and forth through session shape selection history
 */

import { useEffect, useRef } from 'react';

export interface KeyboardActions {
  onTogglePlay: () => void;
  onToggleShapeEditor: () => void;
  onToggleQuickSearch: () => void;
  onToggleBookmarks?: () => void;
  onToggleCapture?: () => void;
  onToggleOscillate: () => void;
  onToggleFilterEditMode: () => void;
  onToggleFilter: () => void;
  onToggleFiltersOpen?: () => void;
  onToggleFilterQuickSearch?: () => void;
  onToggleEnvelope?: () => void;
  onToggleEnvelopesOpen?: () => void;
  onToggleEnvelopeQuickSearch?: () => void;
  onToggleBundlesOpen?: () => void;
  onToggleKeyboard?: () => void;
  onFlipPolarity?: () => void;
  onToggleMidiHold?: () => void;
  onToggleTuningQuickSearch?: () => void;
  onPanicClear?: () => void;
  onJumpBookmarkA: () => void;
  onJumpBookmarkB: () => void;
  onSetBookmarkFromCurrent: (slot: 'a' | 'b', withSparks?: boolean) => void;
  onStepPrimaryD: (step: number) => void;
  onHistoryBack: () => void;
  onHistoryForward: () => void;
}

export interface UseKeyboardShortcutsOptions {
  isCaptureOpen: boolean;
  isQuickSearchOpen: boolean;
  isFilterQuickSearchOpen?: boolean;
  isTuningQuickSearchOpen?: boolean;
  actions: KeyboardActions;
}

export function useKeyboardShortcuts({
  isCaptureOpen,
  isQuickSearchOpen,
  isFilterQuickSearchOpen,
  isTuningQuickSearchOpen,
  actions,
}: UseKeyboardShortcutsOptions): void {
  const actionsRef = useRef<KeyboardActions>(actions);
  actionsRef.current = actions;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If Quick Search Modals are open, let them handle their own keyboard navigation
      if (isQuickSearchOpen || isFilterQuickSearchOpen || isTuningQuickSearchOpen) {
        return;
      }

      // Ignore browser modifier combinations (e.g. Ctrl+S, Ctrl+A, Alt+F)
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      const target = e.target as HTMLElement | null;
      const isTextInput =
        target &&
        ((target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text') ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (isTextInput) {
        return;
      }

      if (e.key === 'Escape') {
        // Only run global panic clear when no modal dialogue is open (modals handle Escape to close)
        if (typeof document !== 'undefined' && document.querySelector('[role="dialog"]')) {
          return;
        }
        e.preventDefault();
        actionsRef.current.onPanicClear?.();
        return;
      }

      // Spacebar Focus Guard: always toggle play/pause unless Capture Modal is open (where Space taps the rhythm pad)
      if (e.code === 'Space' || e.key === ' ') {
        if (isCaptureOpen) return;
        e.preventDefault();
        e.stopPropagation();
        if (
          document.activeElement instanceof HTMLElement &&
          (document.activeElement.tagName === 'BUTTON' ||
            document.activeElement.tagName === 'SELECT' ||
            document.activeElement.tagName === 'INPUT')
        ) {
          document.activeElement.blur();
        }
        actionsRef.current.onTogglePlay();
        return;
      }

      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        if (e.shiftKey) {
          actionsRef.current.onToggleQuickSearch();
        } else {
          actionsRef.current.onToggleShapeEditor();
        }
        return;
      }

      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        actionsRef.current.onToggleBookmarks?.();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        actionsRef.current.onToggleCapture?.();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        actionsRef.current.onToggleOscillate();
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        actionsRef.current.onToggleFilterEditMode();
      } else if (e.code === 'KeyF' || e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (e.shiftKey) {
          if (actionsRef.current.onToggleFilterQuickSearch) {
            actionsRef.current.onToggleFilterQuickSearch();
          } else {
            actionsRef.current.onToggleFiltersOpen?.();
          }
        } else {
          actionsRef.current.onToggleFilter();
        }
      } else if (e.code === 'KeyV' || e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        if (e.shiftKey) {
          if (actionsRef.current.onToggleEnvelopeQuickSearch) {
            actionsRef.current.onToggleEnvelopeQuickSearch();
          } else {
            actionsRef.current.onToggleEnvelopesOpen?.();
          }
        } else {
          actionsRef.current.onToggleEnvelope?.();
        }
      } else if (e.code === 'KeyU' || e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        actionsRef.current.onToggleBundlesOpen?.();
      } else if ((e.key === 't' || e.key === 'T') && e.shiftKey) {
        e.preventDefault();
        actionsRef.current.onToggleTuningQuickSearch?.();
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        if (e.shiftKey) {
          actionsRef.current.onSetBookmarkFromCurrent('a', true);
        } else {
          actionsRef.current.onJumpBookmarkA();
        }
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        if (e.shiftKey) {
          actionsRef.current.onSetBookmarkFromCurrent('b', true);
        } else {
          actionsRef.current.onJumpBookmarkB();
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        actionsRef.current.onFlipPolarity?.();
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        actionsRef.current.onToggleKeyboard?.();
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        actionsRef.current.onToggleMidiHold?.();
      } else if (e.key === 'ArrowRight') {
        // Move UP in frequency / pitch (decrease d)
        e.preventDefault();
        const step = e.shiftKey ? 0.5 : 1.0;
        actionsRef.current.onStepPrimaryD(-step);
      } else if (e.key === 'ArrowLeft') {
        // Move DOWN in frequency / pitch (increase d)
        e.preventDefault();
        const step = e.shiftKey ? 0.5 : 1.0;
        actionsRef.current.onStepPrimaryD(step);
      } else if (e.key === 'ArrowUp') {
        // Navigate BACK in session shape selection history
        e.preventDefault();
        actionsRef.current.onHistoryBack();
      } else if (e.key === 'ArrowDown') {
        // Navigate FORWARD in session shape selection history
        e.preventDefault();
        actionsRef.current.onHistoryForward();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isCaptureOpen, isQuickSearchOpen, isFilterQuickSearchOpen, isTuningQuickSearchOpen]);
}
