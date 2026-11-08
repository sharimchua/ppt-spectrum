# Core Domain & Mathematical Models

## Purpose

The `src/core` domain contains all pure TypeScript data structures, mathematical functions, rational arithmetic, axis conversions, prime harmonic profiles, and scene serialisation. It has **zero DOM, window, or Web Audio dependencies** and is strictly testable in pure Node/Vitest environments.

## Ownership

- `src/core/types.ts` — Core data contracts: `Ratio`, `Partial`, `Shape`, `Placement`, `BandFilter`, `Scene`, `CosmeticsConfig`, and layout schemas.
- `src/core/ppt-constants.ts` — Theory constants ($f_{\text{TPL}} = 25.8\text{ Hz}$, $T_{\text{TPL}} \approx 38.76\text{ ms}$), canonical Solfège palette, Prime palette, and Hann window decay.
- `src/core/axis.ts` — DuPeriod coordinate $d$, frequency, period, BPM conversions, and Solfège degree addressing.
- `src/core/rational.ts` — Exact rational arithmetic, GCD/LCM, continued-fraction rationalisation, and 11-limit prime factorisation.
- `src/core/shape.ts` — Partial positioning, BandFilter raised-cosine application, and prime spectral profile calculation.
- `src/core/alignment.ts` — Ghost fundamental, coincidence counting, Plomp-Levelt roughness curves, and Tenney complexity.
- `src/core/presets.ts` — Canonical teaching shapes (Pure tone, Saw, Square, Clarinet, Plucked string, Piano, Bell, Free-free bar, Marimba bar, Polyrhythms).
- `src/core/config.ts` — Default application configuration, sanitisation, and localStorage persistence.
- `src/core/layout-models.ts` — Modular layout tree models and presets.
- `src/core/scene-codec.ts` — Compact versioned URL hash encoder/decoder.

## Local Contracts

- Functions must be deterministic, pure, and free of side effects.
- Australian English spelling must be maintained in all comments and documentation.
- Round-trip conversions between $d$, $f$, period, and BPM must be tested to high precision.
