# Core Domain & Mathematical Models

## Purpose

The `src/core` domain contains all pure TypeScript data structures, mathematical functions, rational arithmetic, axis conversions, prime harmonic profiles, scene serialisation, and modular layout tree manipulation algorithms. It has **zero DOM, window, or Web Audio dependencies** and is strictly testable in pure Node/Vitest environments.

## Ownership

- `src/core/types.ts` — Core data contracts: `Ratio`, `Partial`, `Shape`, `Placement`, `Filter`, `BandFilter` (legacy migration), `Scene`, `CosmeticsConfig`, and layout schemas.
- `src/core/filter-types.ts` — Generic filter data contracts: `Filter`, compound `FilterCondition` (range and cycle), `RangeSpan`, `RangeEndpoint`, `SpanView`, and constants.
- `src/core/endpoint-parse.ts` — Pure string parsers and formatters for range endpoints (ratios, cents, EDO steps, frequencies, tempo, and DuPeriod coordinates).
- `src/core/filter-eval.ts` — Pure mathematical evaluation of generic filters: endpoint coordinate mapping, modular period-reduced span matching, cycle grid slot matching, Zadeh fuzzy logic combination, static duty gains, and worklet compilation.
- `src/core/filter-presets.ts` — Procedural filter generators: Björklund Euclidean rhythm generator, Xenakis residue sieves, Just ↔ 12-TET microtonal interval windows, harmonic series combs, and starter filters.
- `src/core/filter-migration.ts` — Legacy BandFilter migration, golden mathematical equivalence evaluation, and sanitisation for persisted localStorage scenes.
- `src/core/envelope-types.ts` — Standalone `Envelope` data contracts supporting Pitch-space ADSR and Rhythm-space Supercycle contours.
- `src/core/envelope-presets.ts` — Canonical Pitch-space and Rhythm-space envelope presets plus `evaluateRhythmEnvelopeGain`.
- `src/core/ppt-constants.ts` — Theory constants ($f_{\text{TPL}} = 25.8\text{ Hz}$, $T_{\text{TPL}} \approx 38.76\text{ ms}$), canonical Solfège palette, Prime palette, and Hann window decay.
- `src/core/axis.ts` — DuPeriod coordinate $d$, frequency, period, BPM conversions, and Solfège degree addressing.
- `src/core/rational.ts` — Exact rational arithmetic, GCD/LCM, continued-fraction rationalisation, and 11-limit prime factorisation.
- `src/core/shape.ts` — Partial positioning, BandFilter raised-cosine application, and prime spectral profile calculation.
- `src/core/alignment.ts` — Ghost fundamental, coincidence counting, Plomp-Levelt roughness curves, and Tenney complexity.
- `src/core/presets.ts` — Canonical teaching shapes (Pure tone, Duple 1:2, Quadruple 1:4, Hemiola 3:2, Polyrhythms 4:3 & 5:4, Saw, Square, Clarinet, Plucked string, Piano, Bell, Free-free bar, Marimba bar).
- `src/core/config.ts` — Default application configuration, sanitisation, and localStorage persistence.
- `src/core/layout-models.ts` — Modular layout tree models, tree split/remove/duplicate/add operations, presets, and URL-safe base64 slug serialisation for deep linking.
- `src/core/library-models.ts` — Higher-level `LibraryBundle` presets (Shape + Filter + Envelope), URL-safe slug encoding/decoding, and non-destructive, idempotent library set import/export.
- `src/core/decompose.ts` — Dynamic 11-limit DuPeriod interval quantisation for tapped rhythm inputs.
- `src/core/scene-ops.ts` — Pure Scene updaters for placement DuPeriod coordinates, filter aperture states, and shape library upsert/deletion.
- `src/core/shape-editing.ts` — Pure VoiceAnchor, harmonic partial, ADSR envelope, overtone series presets, inharmonicity, and damping operations.
- `src/core/shape-history.ts` — Pure session shape navigation stack with bounded backward/forward traversal and deletion handling.
- `src/core/sweep.ts` — Pure bookmark continuum sweep easing (A → dwell → B → dwell) with cosine interpolation and timing guards.

### Tests (`src/core/__tests__/`)

- `core.test.ts` — Axis maths, rational algebra and prime limits, alignment and ghost fundamental, BandFilter, presets and piano inharmonicity, graphics profile persistence.
- `decompose.test.ts` — Rhythm decomposer and 11-limit quantiser.
- `endpoint-parse.test.ts` — Range endpoint string parsing across all supported units and display formatting.
- `envelope.test.ts` — Rhythm-space Supercycle envelope evaluation and Envelope library scene operations.
- `filter-eval.test.ts` — Mathematical evaluation of span matches, circular period reduction, cycle slot rounding, fuzzy combination, and worklet compilation.
- `filter-migration.test.ts` — Golden parity evaluation between legacy BandFilter and modern Filter, plus persistence sanitisation.
- `filter-presets.test.ts` — Björklund Euclidean rhythm patterns, Xenakis residue sieves, Just ↔ 12-TET windows, and starter filters.
- `layout.test.ts` — Layout tree operations, slug round-trips, and ring-clock band calculation (imports `calculateRingClockBands` from `src/renderers`; new renderer tests belong in `src/renderers/__tests__/`).
- `library-models.test.ts` — Library bundle slug round-trips, idempotent re-imports, and collision-safe non-destructive merging.
- `phase6.test.ts` — Alignment and inharmonicity models (named after its delivery phase; prefer feature-based names for new test files).
- `scene-ops.test.ts` — Scene placement coordinate stepping, filter mode cycling, shape capture, upsert, and duplication.
- `shape-editing.test.ts` — VoiceAnchor and partial addition/removal guards, mute/unmute restoration, overtone presets, inharmonicity, and damping.
- `shape-history.test.ts` — Shape history stack initialisation, push with redo truncation, bounded stepping, and shape removal.
- `sweep.test.ts` — Bookmark sweep timing calculation, phase boundary progress evaluation, and cycle looping.

## Known Exceptions

- `config.ts` reads/writes `window.localStorage` for scene persistence, guarded by `typeof window === 'undefined'` so it remains safe under Node/Vitest. It is the **only** file exempted from the `no-restricted-globals` lint rule in [eslint.config.js](../../eslint.config.js). Do not add browser access elsewhere in `src/core`; inject it from the calling layer.

## Shared Library Architecture Note

The layout tree structures and algorithms in `layout-models.ts` (`splitCellInTree`, `removeCellFromTree`, `duplicateCellInTree`, `moveCellInTree`, `addCellToTree`, `encodeLayoutToSlug`, `decodeLayoutFromSlug`) are designed with pure mathematical purity and zero DOM dependencies. They form an identical contract to `ppt-visualiser`, providing a direct path to extraction into a shared library package (`@ppt/layout` or `@ppt/core`) across the Midlife Muso PPT ecosystem.

## Local Contracts

- Functions must be deterministic, pure, and free of side effects.
- Australian English spelling must be maintained in all comments and documentation.
- Round-trip conversions between $d$, $f$, period, and BPM must be tested to high precision.
- Layout slug roundtrips (`encodeLayoutToSlug` <-> `decodeLayoutFromSlug`) must produce structurally identical layout trees.
- Lint-enforced: no imports from `react`, `src/audio`, `src/renderers`, or `src/components`, and no browser globals (see Known Exceptions).
- Every new exported function needs a unit test in `src/core/__tests__/`.
