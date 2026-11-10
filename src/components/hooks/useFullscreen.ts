/**
 * Fullscreen state management hook.
 * Tracks document fullscreen change events and exposes toggle action.
 */

import { useState, useEffect, useCallback } from 'react';

export interface UseFullscreenResult {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

export function useFullscreen(): UseFullscreenResult {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  return {
    isFullscreen,
    toggleFullscreen,
  };
}
