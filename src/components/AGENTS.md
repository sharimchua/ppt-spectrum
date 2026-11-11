# UI Presentation Layer & Viewport Stack

## Purpose

The `src/components` domain contains all React 18 UI components, the 4-layer viewport stack (`SpectrumViewport`), modular flexbox layout engine, layout editing suite, standardised top control toolbar, capture modal, and theory walkthrough modal (`InfoModal`).

## Ownership

- `src/components/SpectrumViewport.tsx` — 4-layer canvas container (`bgCanvas`, lens layer, `effectsCanvas`, `postProcessingCanvas`) with high-DPI scaling, ResizeObserver, and docked top Layout Editor control banner.
- `src/components/ControlToolbar.tsx` — Standardised top menu bar featuring unified branding logo, play/pause transport, Slower <-> Faster timeline slider ($x = -d$), preset selector, audio mode switcher, capture modal launcher, layout preset selector, layout edit mode toggle, share deeplink button, and fullscreen toggle.
- `src/components/FlexLayoutRenderer.tsx` — Recursive multi-cell Flexbox layout renderer supporting nested containers and live cell splitting/reordering.
- `src/components/CellViewport.tsx` — Modular lens cell wrapper providing canvas high-DPI binding and in-place layout editor controls (lens switcher, split row/col, duplicate, remove).
- `src/components/CaptureModal.tsx` — Rhythm tap pad with 11-limit DuPeriod rationaliser and microphone pitch detector.
- `src/components/InfoModal.tsx` — Comprehensive 4-tab interactive theory documentation and tutorial modal with scroll-spy navigation.
- `src/components/SettingsDrawer.tsx` — Settings drawer controlling WebGL performance profiles (Max Effects, Balanced, Eco Mode), optical cosmetics, audio focus, and external pedagogy links.
- `src/components/TraySheet.tsx` — Slide-up bottom tray sheet housing the shape partial inspector.
- `src/components/shape-editor/ShapeEditor.tsx` — Modular shape inspector container and tab orchestrator.
- `src/components/App.tsx` — Main application shell integrating UI, `RenderCoordinator`, `AudioEngine`, URL deeplink slug decoding, and keyboard shortcuts.
- `src/components/AppModals.tsx` — Unified modal orchestration component housing all overlay dialogs, bottom sheets, search modals, and radial menu overlays.
- `src/components/RadialMenuOverlay.tsx` — Mobile annular pie-wedge radial menu (thumb spawn point, top-layer portal) with a dedicated Filters sub-menu.
- `src/components/radial-menu-segments.tsx` — Annular radial pie wedge segment definitions and sub-menu builders.
- `src/components/MusicalBookmarksModal.tsx` — Musical bookmark points editor.
- `src/components/bookmarks-storage.ts` — Bookmark data contracts, defaults, and localStorage persistence (`loadSavedBookmarks`, `saveBookmarks`).
- `src/components/FilterEditHud.tsx` — Floating filter aperture editor HUD banner with centre/width/skirt parameters and mode cycling.
- `src/components/ShapeQuickSearchModal.tsx` — Keyboard-driven quick search for preset shapes.
- `src/components/FilterQuickSearchModal.tsx` — Keyboard-driven command palette and quick search for filters.

### Tutorial & Theory Documentation (`src/components/info-modal/`)

- `OverviewSection.tsx` — Hero card with Sawtooth Sweep Demo launcher, 8 analytical lens overview cards, and quick interaction tips.
- `ConceptsSection.tsx` — 7 numbered theoretical foundation cards with embedded interactive SVG exploration diagrams.
- `CustomiseSection.tsx` — Platform-adaptive controls guide with interactive Touch & Mobile (Radial Menu, rotary jog wheel, double tap) vs Desktop (keyboard matrix, flex layout) views.
- `LinksSection.tsx` — Ecosystem links to official portals, OKF knowledge bundle, curriculum, and lesson archives.
- `TplContinuumDiagram.tsx` — Interactive continuum ruler with clickable landmarks, DuPeriod vs Physical Hz scale switch, and TPL transition zone.
- `OvertoneTimbreDiagram.tsx` — Interactive waveform and timbre micro-polyphony explorer with waveform presets, live summed oscilloscope, and dual Rhythm/Pitch perception cards.
- `DuMetricCycleDiagram.tsx` — Interactive 12-tone Solfège and DuMetric Clock dial with PPT geometric noteheads, intervals, and groove overlays (Hemiola, Tresillo).
- `PrimeFamiliesDiagram.tsx` — Interactive 5 Prime Families explorer detailing harmonic intervals, rhythmic feel, and coincidence cycles.

### Filters & Rhythm Sieves (`src/components/filters/`)

- `FiltersSheet.tsx` — Mobile bottom sheet and desktop side drawer for compound filters.
- `FilterPicker.tsx` — Mobile-first filter preset picker with category filter chips and structured dropdown.
- `FilterActionsMenu.tsx` — Filter actions toolbar supporting fork, rename, duplicate, delete, and new filter creation.
- `FilterSummaryBar.tsx` — Action (keep/remove), Combine (all/any), depth slider, and plain-language summary.
- `ConditionCard.tsx` — Collapsible condition chip with match preview, reordering, and editor expansion.
- `PresetPicker.tsx` — Grouped modal list of condition presets (Spectral, Interval, Harmonic, Cycle).
- `CycleConditionTab.tsx` — Cycle condition template selector (Grids, Metric Accents, Euclidean, Blank Sieves).
- `RangeConditionEditor.tsx` — Range condition editor with spans list and skirt softness.
- `SpanRow.tsx` — Lower and upper endpoint inputs with open-ended toggles.
- `EndpointInput.tsx` — Validated text field for endpoints (`5/4`, `400¢`, `440hz`, `d:1.5`).
- `CycleConditionEditor.tsx` — Divisions selector, rotation, tolerance, off-grid match, and Euclidean generator.
- `CycleSlotRing.tsx` — Interactive SVG circular slot ring with Apex slot 0.
- `SupercycleStrip.tsx` — Modulation across repeated scene cycles.
- `filter-ui-format.ts` — Pure display formatting helpers.

### Shape Editor (`src/components/shape-editor/`)

- `ShapeEditor.tsx` — Container coordinating tabs and delegating actions to `useShapeEditing`.
- `shape-editor-data.ts` — Voice options, interval presets, and acoustic ADSR instrument envelope presets.
- `useShapeEditing.ts` — Hook binding active shape to pure core shape-editing mutations and preset forks.
- `ShapeLibraryHeader.tsx` — Preset/user shape selector dropdown, fork/duplicate/delete/new controls, and tab buttons.
- `ShapePicker.tsx` — Mobile-first shape picker with category filter chips and structured dropdown.
- `ShapeActionsMenu.tsx` — Mobile-first action toolbar supporting fork, rename, duplicate, delete, and new shape creation.
- `PartialsTab.tsx` — Voice anchor cards container, overtone macros, and add-anchor controls.
- `OvertoneMacros.tsx` — Inharmonicity stretch coefficient (B) and spectral damping macro buttons.
- `VoiceAnchorCard.tsx` — Voice anchor card with ratio, DuMetric offset, percussion voice, gain, and nested partial rows.
- `AnchorPartialRow.tsx` — Single harmonic partial row with ratio selector, amplitude slider, phase offset, and mute/delete controls.
- `EnvelopeTab.tsx` — Acoustic ADSR envelope tab with interactive curve, instrument presets, and parameter sliders.
- `AdsrCurve.tsx` — SVG ADSR curve visualiser with high-harmonic damping overlay and phase labels.
- `adsr-curve-geometry.ts` — Pure mathematical calculation of SVG bezier curve geometry and anchor coordinates.

### Custom Hooks (`src/components/hooks/`)

- `useSceneEngine.ts` — Synchronous RenderCoordinator/AudioEngine updates, debounced scene persistence, and telemetry binding.
- `useLayoutState.ts` — Modular layout tree state, cell splitting/removal, deeplink sharing, and hashchange listeners.
- `layout-persistence.ts` — Layout URL slug extraction, localStorage loaders, and storage keys.
- `useTransport.ts` — Playback transport state, note strikes, and viewport cosmetic shockwaves/sparks.
- `useBookmarks.ts` — Musical bookmarks, A/B jump and set, and requestAnimationFrame continuum sweep loop.
- `useShapeLibrary.ts` — Preset selection, user shape creation, duplication, deletion, capture, and undo/redo history stack.
- `useFilters.ts` — Dedicated Filters sheet visibility, condition CRUD, canvas aperture parameter scrubbing, and mode cycling.
- `useCanvasFilterGestures.ts` — Canvas gesture interactions for filter aperture scrubbing (drag, wheel, touch).
- `useKeyboardShortcuts.ts` — Global capture-phase keyboard shortcuts.
- `useFullscreen.ts` — Document fullscreen state tracking and toggle.
- `useTeachingDemo.ts` — Educational walkthrough demo orchestrator setting Sawtooth shape, TPL bookmarks, Teaching Trio layout, and sweep oscillation.

### Tests (`src/components/__tests__/`)

- `adsr-curve-geometry.test.ts` — SVG ADSR curve geometry, bezier path strings, segment width clamping, and damping threshold visibility.

## Maintainability & Architecture Guidelines

- **Where new logic goes**:
  - **Pure mathematical models & domain operations** → `src/core/` (zero React, zero DOM, fully unit tested in Node).
  - **Stateful UI workflows, persistence, and lifecycle bindings** → `src/components/hooks/` (pure `.ts` custom hooks).
  - **Visual presentation & DOM elements** → Small, cohesive components (≤ 350 lines, enforced by ESLint `max-lines` at 400).
- Non-component exports (constants, persistence helpers) in `.tsx` files trigger `react-refresh/only-export-components` warnings; place new helpers in a sibling `.ts` module instead.
- Existing `react-hooks/exhaustive-deps` warnings are tracked by the lint warning ratchet. Fix them deliberately (refs are often intentional for 60 FPS paths); do not add new ones.

## Local Contracts

- Zero React reconciliation inside animation frames or audio worklet callbacks.
- English (Australian) spelling conventions throughout all UI labels, tooltips, dialogs, and comments.
- Layout deeplinks encode and decode seamlessly via URL query `?layout=<slug>` or hash `#layout=<slug>` using URL-safe base64 payloads.
