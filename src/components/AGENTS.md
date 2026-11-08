# UI Presentation Layer & Viewport Stack

## Purpose

The `src/components` domain contains all React 18 UI components, the 4-layer viewport stack (`SpectrumViewport`), layout containers, control toolbars, shape editors, and settings drawers.

## Ownership

- `src/components/SpectrumViewport.tsx` — 4-layer canvas container (`bgCanvas`, lens layer, `effectsCanvas`, `postProcessingCanvas`) with high-DPI scaling and ResizeObserver.
- `src/components/ControlToolbar.tsx` — Top bar with play/pause, placement slider ($d$), preset selector, and audio status.
- `src/components/App.tsx` — Main application shell integrating UI, `RenderCoordinator`, and `AudioEngine`.

## Local Contracts

- Zero React reconciliation inside animation frames or audio worklet callbacks.
- English (Australian) spelling conventions throughout all UI labels and tooltips.
