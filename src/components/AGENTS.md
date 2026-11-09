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
- `src/components/App.tsx` — Main application shell integrating UI, `RenderCoordinator`, `AudioEngine`, URL deeplink slug decoding, and keyboard shortcuts.

## Local Contracts

- Zero React reconciliation inside animation frames or audio worklet callbacks.
- English (Australian) spelling conventions throughout all UI labels, tooltips, dialogs, and comments.
- Layout deeplinks encode and decode seamlessly via URL query `?layout=<slug>` or hash `#layout=<slug>` using URL-safe base64 payloads.
