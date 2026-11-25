import { Scene } from '../../core/types';

export const STAGE_PROTOCOL = 'midlifemuso-stage-v1';
export const STAGE_APP_ID = 'spectrum';

export function isStageEmbedded(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      window.parent !== window &&
      new URLSearchParams(window.location.search).get('stage') === '1'
    );
  } catch {
    return false;
  }
}

export function getInitialStageRole(): 'teacher' | 'student' {
  if (typeof window === 'undefined') return 'student';
  return new URLSearchParams(window.location.search).get('role') === 'teacher'
    ? 'teacher'
    : 'student';
}

export function postStageMessage(msg: Record<string, unknown>): void {
  if (typeof window === 'undefined' || window.parent === window) return;
  window.parent.postMessage({ protocol: STAGE_PROTOCOL, appId: STAGE_APP_ID, ...msg }, '*');
}

export function pickSyncableScene(scene: Scene): Partial<Scene> {
  return {
    shapes: scene.shapes,
    placements: scene.placements,
    filter: scene.filter,
    filters: scene.filters,
    envelope: scene.envelope,
    envelopes: scene.envelopes,
    anchors: scene.anchors,
    lenses: scene.lenses,
    audio: scene.audio,
  };
}

export function applyStageEcoMode(
  updateScene: (updater: Scene | ((prev: Scene) => Scene)) => void,
  ecoMode: boolean
): void {
  const nextProfile = ecoMode ? 'eco' : 'balanced';
  updateScene((prev) =>
    prev.cosmetics.performanceProfile === nextProfile
      ? prev
      : {
          ...prev,
          cosmetics: {
            ...prev.cosmetics,
            performanceProfile: nextProfile,
          },
        }
  );
}

export function mountAudioPromptPill(onTap: () => void): {
  show: () => void;
  hide: () => void;
  destroy: () => void;
} {
  let el: HTMLButtonElement | null = null;
  const hide = () => {
    if (el) {
      el.remove();
      el = null;
    }
  };
  const show = () => {
    if (el || typeof document === 'undefined' || !document.body) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Tap to Enable Sound';
    btn.style.cssText =
      'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:2147483647;' +
      'padding:10px 18px;border-radius:9999px;border:1px solid rgba(34,211,238,0.55);' +
      'background:rgba(15,23,42,0.95);color:#67e8f9;font:600 13px/1.2 system-ui,sans-serif;' +
      'box-shadow:0 10px 28px rgba(0,0,0,0.45);cursor:pointer;backdrop-filter:blur(8px);';
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      onTap();
    });
    document.body.appendChild(btn);
    el = btn;
  };
  return { show, hide, destroy: hide };
}
