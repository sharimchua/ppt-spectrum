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

## Commands & Definition of Done

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server on port 5174 (LAN-exposed). |
| `npm run typecheck` | `tsc --noEmit` under `strict`, `noUnusedLocals`, `noUnusedParameters`. |
| `npm run lint` | ESLint flat config ([eslint.config.js](eslint.config.js)) with architectural guardrails; capped by `--max-warnings`. |
| `npm run lint:fix` | Auto-fix safe lint issues. |
| `npm test` | Vitest (Node environment, no DOM). |
| `npm run check` | **Required before finishing any change**: typecheck + lint + tests. |
| `npm run build` | Typecheck then production build to `dist/`. |

- A change is done only when `npm run check` passes with no new errors and no increase in warnings.
- **Warning ratchet**: `lint` uses `--max-warnings N` (current baseline: existing `react-hooks/exhaustive-deps`, `no-explicit-any`, and `react-refresh` warnings). When you fix warnings, lower `N` in `package.json`; never raise it.
- Do not silence rules with `eslint-disable` or `@ts-ignore`/`@ts-expect-error` without a same-line justification comment. Prefer fixing the boundary violation.

## Repository Map

- `src/main.tsx` — React root mount and production-only service worker registration.
- `src/index.css` — Tailwind entry stylesheet.
- `src/core/`, `src/audio/`, `src/renderers/`, `src/components/` — see Child DOX Index.
- `public/` — Static PWA assets (`sw.js`, `manifest.webmanifest`, `logo.svg`). Bump `CACHE_NAME` in `sw.js` when the cached asset list changes.
- `docs/design-spec.md` — North-star product and theory spec; consult before changing domain behaviour.
- `eslint.config.js`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `.editorconfig` — tooling.
- `dist/` — build output (git-ignored; never edit).

## Layer Dependency Direction (lint-enforced)

```text
components ──► renderers ──► core
     │                         ▲
     └──────► audio ───────────┘
```

- `src/core` imports nothing from other layers, React, or browser globals (`no-restricted-imports`, `no-restricted-globals`).
- `src/renderers` and `src/audio` never import React or `src/components`; `src/audio` never imports `src/renderers`.
- `src/renderers` may not assign a non-zero `ctx.shadowBlur` (`no-restricted-syntax`).
- Tests may cross layers, but place new tests in the `__tests__/` folder of the layer under test.

## Agent Working Conventions

- Read the nearest `AGENTS.md` and every parent before editing; update the relevant **Ownership** list in the same change when you add, rename, move, or delete a file.
- Prefer small, focused modules. `src/components/App.tsx` and `src/components/ShapeEditor.tsx` exceed 1,000 lines — extract cohesive hooks or subcomponents rather than growing them further.
- Domain identifiers that mirror web APIs keep their API spelling (`color`, `textAlign = 'center'`); Australian spelling applies to prose, comments, UI copy, and new domain identifiers.
- Keep functions typed at module boundaries; avoid `any` (use `unknown` plus narrowing).

## Child DOX Index

- [src/core/AGENTS.md](src/core/AGENTS.md) — Pure mathematical models, axis coordinates, DuPeriod addressing, rational algebra, ghost fundamental, prime profiles, and presets.
- [src/renderers/AGENTS.md](src/renderers/AGENTS.md) — 60 FPS Canvas 2D lenses, WebGL post-processing shaders, GPU point-sprite particles, analytical shockwaves, CRT/film filters, and frame governor.
- [src/audio/AGENTS.md](src/audio/AGENTS.md) — Web Audio API, AudioWorklet master-phase synthesis, continuous limen crossing kernel, poetic voice maps, and small-speaker assist.
- [src/components/AGENTS.md](src/components/AGENTS.md) — React 18 UI presentation layer, 4-layer viewport, stage/tray layouts, partial editors, and settings drawers.
