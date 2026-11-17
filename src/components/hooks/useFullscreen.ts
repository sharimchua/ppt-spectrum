/**
 * Fullscreen state management hook.
 * Tracks document fullscreen change events (including WebKit prefixes for iPadOS/Safari)
 * and exposes toggle action with navigationUI: 'hide' for mobile Chrome/Android.
 */

import { useState, useEffect, useCallback } from 'react';

interface WebKitDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
}

interface WebKitElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
}

export interface UseFullscreenResult {
  isFullscreen: boolean;
  isFullscreenSupported: boolean;
  toggleFullscreen: () => void;
}

export function useFullscreen(): UseFullscreenResult {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const isFullscreenSupported =
    typeof document !== 'undefined' &&
    Boolean(
      document.documentElement.requestFullscreen ||
        (document.documentElement as WebKitElement).webkitRequestFullscreen
    );

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as WebKitDocument;
      setIsFullscreen(Boolean(document.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    const doc = document as WebKitDocument;
    const el = document.documentElement as WebKitElement;
    const active = Boolean(document.fullscreenElement || doc.webkitFullscreenElement);

    if (!active) {
      if (el.requestFullscreen) {
        el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen().catch(() => {});
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if (doc.webkitExitFullscreen) {
      doc.webkitExitFullscreen().catch(() => {});
    }
  }, []);

  return {
    isFullscreen,
    isFullscreenSupported,
    toggleFullscreen,
  };
}
