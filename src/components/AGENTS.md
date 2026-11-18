# UI Presentation Layer & Viewport Stack

## Purpose

The `src/components` domain contains all React 18 UI components, the 4-layer viewport stack (`SpectrumViewport`), modular flexbox layout engine, layout editing suite, standardised top control toolbar, capture modal, and theory walkthrough modal (`InfoModal`).

## Ownership

- `src/components/SpectrumViewport.tsx` — 4-layer canvas container (`bgCanvas`, lens layer, `effectsCanvas`, `postProcessingCanvas`) with high-DPI scaling, ResizeObserver, and docked top Layout Editor control banner.
- `src/components/ControlToolbar.tsx` — Standardised top menu bar featuring unified branding logo, play/pause transport, Slower <-> Faster timeline slider ($x = -d$), interactive Cross-Limen Coupling selectors (`Carrier` & `Container`), preset selector, capture modal launcher, layout preset selector, layout edit mode toggle, share deeplink button, and fullscreen toggle.
- `src/components/CouplingSelectorPill.tsx` — Interactive dropdown pill for selecting Cross-Limen `Pitch Carrier` (Rhythm Space) and `Rhythm Container` (Pitch Space) across `Auto`, `Self`, `Drum Kit` / `Static`, and `Library Shape` modes.
- `src/components/ToolbarOverflowMenu.tsx` — Responsive desktop overflow menu (`More`) surfacing secondary workspace tools collapsed at narrower desktop breakpoints (`md`–`xl`).
- `src/components/FlexLayoutRenderer.tsx` — Recursive multi-cell Flexbox layout renderer supporting nested containers and live cell splitting/reordering.
- `src/components/CellViewport.tsx` — Modular lens cell wrapper providing canvas high-DPI binding and in-place layout editor controls (lens switcher, split row/col, duplicate, remove).
- `src/components/CaptureModal.tsx` — Capture modal orchestrator for mic-first rhythm capture and peak-attack 24-partial pitch/timbre capture.
- `src/components/capture/capture-audio.ts` — Shared microphone stream acquisition helper for capture tabs.
- `src/components/capture/CycleWheelPreview.tsx` — Lightweight `CycleWheelLensRenderer` preview canvas for captured rhythm Voice Anchors.
- `src/components/capture/CapturedOnsetList.tsx` — Captured onset list with cycle period tuning and selective per-onset `PhaseOffsetScrubber` quantisation.
- `src/components/capture/RhythmRecorderControls.tsx` — Mic rhythm recorder controls (expected voice count, root cycles, silence auto-stop, and sensitivity meter).
- `src/components/capture/RhythmPreviewBar.tsx` — Shape simplification mode selector, tempo adjustment slider, and preview/apply controls.
- `src/components/capture/rhythm-preview.ts` — Lightweight looping Web Audio preview scheduler for auditioning captured rhythm shapes.
- `src/components/capture/RhythmCaptureTab.tsx` — Mic-first rhythm recorder with silence trimming, Cycle Wheel preview, and shape simplification modes.
- `src/components/capture/PitchCaptureTab.tsx` — Peak-attack armed pitch/timbre capture (24 harmonic or inharmonic partials) with `ShapeRulerPreview` and `RatioScrubber` snapping.
- `src/components/InfoModal.tsx` — Comprehensive 4-tab interactive theory documentation and tutorial modal with scroll-spy navigation.
- `src/components/SettingsDrawer.tsx` — Settings drawer controlling WebGL performance profiles (Max Effects, Balanced, Eco Mode), optical cosmetics, audio focus, and external pedagogy links.
- `src/components/SettingsAudioSection.tsx` — Audio gain, small-speaker assist, auto-mute on blur, and Rhythm Phase Alignment (`Sam-Aligned` vs `Key-Strike`) controls inside `SettingsDrawer`.
- `src/components/TraySheet.tsx` — Floating & minimisable desktop window / mobile bottom sheet housing the shape partial inspector.
- `src/components/FloatingStudioWindow.tsx` — Reusable non-blocking draggable & minimisable desktop floating window paired with a mobile touch sheet (shared by Shapes, Envelopes, and Filters).
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
- `src/components/EnvelopeQuickSearchModal.tsx` — Keyboard-driven command palette and quick search for envelopes (`Shift+V`, `Shift+Enter` to open Envelope Studio).
- `src/components/MidiPermissionModal.tsx` — Web MIDI hardware permission and device selection dialogue.
- `src/components/TuningModal.tsx` — Dedicated Tuning & Rhythm Map floating studio window wrapping `MidiTuningPanel`.
- `src/components/TuningQuickSearchModal.tsx` — Command palette (`Shift+T`) for searching and applying tuning presets (`Shift+Enter` opens Tuning Studio).
- `src/components/MidiTuningPanel.tsx` — Harmonic Profiler-style Prime Family tuning matrix, preset philosophy descriptions, Rhythm Space anchor selector, and live PPT Lens readout.
- `src/components/TuningSystemExplorer.tsx` — Interactive explorer for 3:2 Pythagorean chains and 31-EDO subsets inside `MidiTuningPanel`.
- `src/components/VirtualKeyboard.tsx` — On-screen Solfège piano keyboard supporting Latch/Hold play, hardware MIDI key lighting, TPL polarity flip, and optional interval distance bands.
- `src/components/keyboard/keyboard-layout.ts` — Pure key geometry, Solfège colouring, and interval distance band builders for `VirtualKeyboard`.
- `src/components/keyboard/instrument-layouts.ts` — Pure layout builders for Scale-Degree Strip, 2D Isomorphic Lattice, and 6-string Guitar Fretboard driven by `MidiTuningConfig`.
- `src/components/keyboard/AlternateSurfaces.tsx` — Interactive renderer for Scale-Degree Strip, Isomorphic Lattice, and Guitar Fretboard surfaces inside `VirtualKeyboard`.
- `src/components/keyboard/PianoKeybed.tsx` — Standard 12-key Solfège piano keybed with stacked interval distance bands.
- `src/components/keyboard/PianoToolbarControls.tsx` — Piano-only range, Fit/Fixed, and Interval Bands toolbar controls.
- `src/components/keyboard/PlayPanelStrumBar.tsx` — Inline Strum & Stepped Scale Sequencer bar docked inside `VirtualKeyboard`.
- `src/components/keyboard/InstrumentConfigMenu.tsx` — Inline configuration sub-menu for Scale Strip, Isomorphic Lattice (Hex/Rect, Harmonic/Wicki-Hayden/Fourths), and Guitar/Bass/Ukulele Fretboard.
- `src/components/keyboard/IntervalBandsStrip.tsx` — Stacked Harmonic-Geometry-style interval ratio & frequency distance bands above the keybed.
- `src/components/LibraryShareModal.tsx` — Curated Shape+Filter+Envelope bundles, `?bundle=` slug sharing, and non-destructive library set import/export.
- `src/components/TutorialReturnToast.tsx` — Dismissible, context-aware floating banner displayed during guided live demos with regime narration, sweep Pause/Resume toggle, and one-click return to the active tutorial section.

### Tutorial & Theory Documentation (`src/components/info-modal/`)

- `tutorial-demos.ts` — Guided tutorial demo configurations, custom override contracts, section identifiers, and intro storage key.
- `prime-sweep-demos.ts` — Guided 7:4, 7:5, and 11:8 prime-family TPL crossover demo configurations.
- `timbre-sweep-demos.ts` — Guided Sine, Sawtooth, Clarinet, Bell, and Custom Overtone Mix timbre sweep demo configurations.
- `coupling-demos.ts` — Guided Cross-Limen coupling demo configurations (Fractal Self, Neutral Kit/Static, Cross-Shape Clarinet).
- `keyboard-cadence-demos.ts` — Guided Solfège Keyboard tuning (5-Limit vs 12-TET) and Supercycle tempo cadence demo configurations.
- `tuning-demos.ts` — Guided Tuning Systems demos (Pythagorean 3:2 Pentatonic vs Heptatonic, 31-EDO Meantone, 31-EDO Septimal).
- `TuningSystemsSection.tsx` — Interactive Tuning Systems guide section with 3:2 chain slider, 31-EDO comparison table, and playable surface overview.
- `OverviewSection.tsx` — Everyday-language welcome card with Amplitude Across Time, the Bicycle-Spoke thought experiment, 'Who is PPT Spectrum for?' persona tiles, terminology primer, 'What is a Shape?' card, interactive `<LensPreviewGrid />`, and quick interaction tips.
- `WhatIsAShapeCard.tsx` — Overview card defining Shape, Voice Anchor, and partial, with three one-click listening examples.
- `LensPreviewGrid.tsx` — Interactive 8-card visual lens grid with SVG thumbnails, click-to-flip cards, and progressive scroll-depth auto-flip.
- `ConceptsSection.tsx` — 7 intuition-first musical experiments, ordered listening-first, with embedded interactive exploration diagrams.
- `AcousticsNamesCallout.tsx` — Textbook acoustics glossary (partial, harmonic, overtone, inharmonic, missing fundamental, beating) used in Concepts.
- `UnderTheHoodSection.tsx` — Sound design & studio guide covering Voice Anchors and Partials, Inharmonic Stretch ($B$), Rhythm Sieves & Spectral Filters (with interactive 8-slot sieve), Pitch ADSR vs Rhythm Supercycles, Tuning Studio & Solfège Keyboard, Mic Capture, Web MIDI, and Audio Modes.
- `CustomiseSection.tsx` — Platform-adaptive controls guide with interactive Touch & Mobile (Radial Menu, rotary jog wheel, double tap) vs Desktop (keyboard matrix, flex layout) views.
- `LinksSection.tsx` — Ecosystem links to official portals, OKF knowledge bundle, curriculum, lesson archives, and Related ideas card.
- `TplContinuumDiagram.tsx` — Interactive continuum ruler with continuous draggable speed slider, clickable landmarks, DuPeriod vs Physical Hz scale switch, and TPL crossover zone.
- `PolyrhythmSamDiagram.tsx` — Interactive polyrhythm-to-harmony alignment timeline with 1× Ghost Root / Sam toggle and live studio demo launchers.
- `OvertoneTimbreDiagram.tsx` — Interactive partial mixer (clickable 1×–8× bars) and waveform presets with live summed oscilloscope and dual Rhythm/Pitch perception cards.
- `DuMetricCycleDiagram.tsx` — Interactive 12-tone Solfège and DuMetric Clock dial with PPT geometric noteheads, intervals, and groove/chord overlays.
- `PrimeFamiliesDiagram.tsx` — Interactive 5 Prime Families explorer detailing harmonic intervals, rhythmic feel, and coincidence cycles, with audible 3, 5, 7, and 11 demo launchers.
- `FractalCouplingDiagram.tsx` — Interactive Cross-Limen Coupling explorer (`Pitch Carrier` & `Rhythm Container`) comparing `Self` (Fractal Mirror), `Neutral` (Drum Kit / Static), and `Cross-Shape Coupling` with live demo launchers.
- `KeyboardTuningDiagram.tsx` — Interactive Solfège Keyboard & Tuning explorer comparing `12-TET` drift vs `5-Limit` Super-Cycle lock on a 4-bar coincidence timeline and demonstrating melodic rhythm / tempo cadences (`3:2` and `4:3`).
- `tempo-cadence-demos.ts` — Pure Supercycle Band-Filter builders for the Section 7 metric-modulation cadence demos (`3:2`, `4:3`, and `4:5:6:8`).

### Envelopes (`src/components/envelopes/`)

- `EnvelopesSheet.tsx` — Mobile bottom sheet and desktop side drawer for standalone Pitch ADSR and Rhythm Supercycle envelopes.

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
- `PartialsTab.tsx` — Scalable voice anchor tab strip with inline add button, ruler preview, and focused `VoiceAnchorCard`.
- `OvertoneMacros.tsx` — Inharmonicity stretch coefficient (B) and spectral damping macro buttons.
- `VoiceAnchorCard.tsx` — Focused voice anchor editor with header name/rhythm voice controls, ratio & phase offset dials, and nested partial tabs.
- `AnchorPartialRow.tsx` — Single harmonic partial editor with DuMetric octave scrubber, autocomplete snap pills, amplitude/phase sliders, and mute/delete controls.
- `RatioScrubber.tsx` — Compact single-line DuMetric pitch-clock dial (rotary on touch, relative horizontal drag on desktop) with rational snap pills.
- `PhaseOffsetScrubber.tsx` — Compact single-line DuMetric phase offset cycle dial (clamped 0–1) with nearby Solfège offset snap pills.
- `ShapeRulerPreview.tsx` — Interactive Ruler-style spectrum preview for selecting Voice Anchors and Partials visually.
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
- `useMidi.ts` — Web MIDI input lifecycle, polyphonic voice dispatch, scene frequency updates, and ruler ghost note syncing.
- `useEnvelopes.ts` — Dedicated Envelopes sheet visibility, Pitch/Rhythm envelope parameter updates, and Envelope library CRUD.
- `useLibraryBundles.ts` — Library bundle presets, `?bundle=` deeplink decoding, and non-destructive JSON/slug import/export.
- `useTeachingDemo.ts` — Educational walkthrough demo orchestrator setting 3:2 Hemiola shape, TPL bookmarks, Teaching Trio layout, and sweep oscillation.
- `useDemoSpotlight.ts` — Automated Cycle-2 bandpass spotlight cues and one-tap contextual actions (voice isolation and tuning A/B comparison) for guided demos.

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
