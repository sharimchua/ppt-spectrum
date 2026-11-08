# DOX Framework — PPT Spectrum Shapes

- DOX is a performant AGENTS.md hierarchy installed here.
- All agents must follow DOX instructions across any edits.

## Core Contract

- `AGENTS.md` files are binding work contracts for their subtrees.
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable `AGENTS.md` plus every parent `AGENTS.md` above it.

## User Preferences & Standards

- **Language & Spelling**: English (Australian) spelling conventions must be strictly maintained throughout the entire repository for all user-facing display text, tooltips, dialogs, comments, documentation, and error messages (e.g. *visualiser*, *initialise*, *customise*, *colour*, *centre*, *maximise*, *minimise*, *prioritise*, *analogue*, *organise*, *harmonise*, *analyse*, *behaviour*).
- **Architecture & Performance**:
  - Keep active audio per-frame synthesis and 60 FPS rendering completely decoupled from React state trees.
  - Core domain logic (`src/core`) must be 100% pure TypeScript with zero DOM/browser dependencies, fully unit tested.
  - Multi-layer canvas stack (`bgCanvas`, `FlexLayoutRenderer` cell canvases, `effectsCanvas`, `postProcessingCanvas`).
  - Zero software blurs (`ctx.shadowBlur = 0`) in 60 FPS paths. Optical bloom, halation, and flares are delegated to the WebGL shader pipeline.
  - Pre-allocate memory buffers (`Float32Array`) in high-frequency rendering and audio worklet loops to avoid garbage collection spikes.
  - Real-time Focus: Auto-mute audio and pause heavy animation loops when window loses focus or document is hidden.
- **Photosensitivity / Flash Safety**:
  - Strict compliance with WCAG 2.2 Three-Flashes threshold. Partials $\le 3\text{ Hz}$ can trigger discrete kinetic pulses/shockwaves; partials $> 3\text{ Hz}$ smoothly blend into continuous steady-state Solfège-tinted glow and rotating phasors.
  - Quick performance profiles (`Max Effects`, `Balanced`, `Eco Mode`) with early-exit cost bypasses.

## Child DOX Index

- [src/core/AGENTS.md](src/core/AGENTS.md) — Pure mathematical models, axis coordinates, DuPeriod addressing, rational algebra, ghost fundamental, prime profiles, and presets.
- [src/renderers/AGENTS.md](src/renderers/AGENTS.md) — 60 FPS Canvas 2D lenses, WebGL post-processing shaders, GPU point-sprite particles, analytical shockwaves, CRT/film filters, and frame governor.
- [src/audio/AGENTS.md](src/audio/AGENTS.md) — Web Audio API, AudioWorklet master-phase synthesis, continuous limen crossing kernel, poetic voice maps, and small-speaker assist.
- [src/components/AGENTS.md](src/components/AGENTS.md) — React 18 UI presentation layer, 4-layer viewport, stage/tray layouts, partial editors, and settings drawers.
