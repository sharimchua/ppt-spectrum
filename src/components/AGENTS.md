# UI Presentation Layer & Viewport Stack

## Purpose

The `src/components` domain contains all React 18 UI components, the 4-layer viewport stack (`SpectrumViewport`), modular flexbox layout engine, layout editing suite, standardised top control toolbar, capture modal, and theory walkthrough modal (`InfoModal`).

## Ownership

- `src/components/SpectrumViewport.tsx` — 4-layer canvas container (`bgCanvas`, lens layer, `effectsCanvas`, `postProcessingCanvas`) with high-DPI scaling, ResizeObserver, and docked top Layout Editor control banner.
- `src/components/ControlToolbar.tsx` — Standardised top menu bar featuring unified branding logo, play/pause transport, Slower <-> Faster timeline slider ($x = -d$), preset selector, audio mode switcher, capture modal launcher, layout preset selector, layout edit mode toggle, share deeplink button, and fullscreen toggle.
- `src/components/FlexLayoutRenderer.tsx` — Recursive multi-cell Flexbox layout renderer supporting nested containers and live cell splitting/reordering.
- `src/components/CellViewport.tsx` — Modular lens cell wrapper providing canvas high-DPI binding and in-place layout editor controls (lens switcher, split row/col, duplicate, remove).
- `src/components/CaptureModal.tsx` — Rhythm tap pad with 11-limit DuPeriod rationaliser and microphone pitch detector.
- `src/components/InfoModal.tsx` — Interactive 4-step theory walkthrough and primer for Prime Period Theory.
- `src/components/SettingsDrawer.tsx` — Settings drawer controlling WebGL performance profiles (Max Effects, Balanced, Eco Mode), optical cosmetics, audio focus, and external pedagogy links.
- `src/components/TraySheet.tsx` — Slide-up bottom tray sheet housing the shape partial inspector.
- `src/components/ShapeEditor.tsx` — Interactive partial inspector, harmonic inharmonicity stretch macros ($B$), and rolloff damping controls.
- `src/components/App.tsx` — Main application shell integrating UI, `RenderCoordinator`, `AudioEngine`, URL deeplink slug decoding, and keyboard shortcuts.
- `src/components/RadialMenuOverlay.tsx` — Mobile annular pie-wedge radial menu (thumb spawn point, top-layer portal) with a full-canvas BandFilter edit mode (`centre`, `width`, `skirt`).
- `src/components/MusicalBookmarksModal.tsx` — Musical bookmark points editor.
- `src/components/bookmarks-storage.ts` — Bookmark data contracts, defaults, and localStorage persistence (`loadSavedBookmarks`, `saveBookmarks`).
- `src/components/FilterEditHud.tsx` — Floating filter aperture editor HUD banner with centre/width/skirt parameters and mode cycling.
- `src/components/ShapeQuickSearchModal.tsx` — Keyboard-driven quick search for preset shapes.

### Custom Hooks (`src/components/hooks/`)

- `useSceneEngine.ts` — Synchronous RenderCoordinator/AudioEngine updates, debounced scene persistence, and telemetry binding.
- `useLayoutState.ts` — Modular layout tree state, cell splitting/removal, deeplink sharing, and hashchange listeners.
- `layout-persistence.ts` — Layout URL slug extraction, localStorage loaders, and storage keys.
- `useTransport.ts` — Playback transport state, note strikes, and viewport cosmetic shockwaves/sparks.
- `useBookmarks.ts` — Musical bookmarks, A/B jump and set, and requestAnimationFrame continuum sweep loop.
- `useShapeLibrary.ts` — Preset selection, user shape creation, duplication, deletion, capture, and undo/redo history stack.
- `useFilterControls.ts` — BandFilter aperture edit mode, parameter selection, and mode cycling.
- `useKeyboardShortcuts.ts` — Global capture-phase keyboard shortcuts.
- `useFullscreen.ts` — Document fullscreen state tracking and toggle.

## Maintainability Notes

- `App.tsx` (~1,100 lines) and `ShapeEditor.tsx` (~1,450 lines) are oversized. When touching them, extract cohesive custom hooks (e.g. deeplink, keyboard shortcuts, audio lifecycle) or subcomponents into new files rather than adding more inline logic.
- Non-component exports (constants, persistence helpers) in `.tsx` files trigger `react-refresh/only-export-components` warnings; place new helpers in a sibling `.ts` module instead.
- Existing `react-hooks/exhaustive-deps` warnings are tracked by the lint warning ratchet. Fix them deliberately (refs are often intentional for 60 FPS paths); do not add new ones.

## Local Contracts

- Zero React reconciliation inside animation frames or audio worklet callbacks.
- English (Australian) spelling conventions throughout all UI labels, tooltips, dialogs, and comments.
- Layout deeplinks encode and decode seamlessly via URL query `?layout=<slug>` or hash `#layout=<slug>` using URL-safe base64 payloads.
