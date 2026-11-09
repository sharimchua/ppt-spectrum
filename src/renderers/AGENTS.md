# Renderers & Graphics Domain

## Purpose

The `src/renderers` domain contains all high-performance 2D Canvas and WebGL graphics engines responsible for visualising spectrum shapes across the Temporal-Place Limen, concentric ring clocks, cycle wheels, and kinetic analogue cosmetics.

## Ownership

- `src/renderers/cosmetics.ts` — Preallocated GPU particle streaming buffers (`Float32Array(2048 * 8)`), kinetic note sparks physics, fluid droplet fountains, and expanding shockwave rings.
- `src/renderers/webgl-post-processing.ts` — GPU WebGL shader pipeline: Point Sprite particle engine (`gl.POINTS`), analytical expanding shockwaves, CRT scanlines, 24fps procedural film grain, and 16 dynamic optical light sources driving halation and lens flares.
- `src/renderers/render-coordinator.ts` — Central 60 FPS `requestAnimationFrame` loop, cached viewport client bounds, real-time focus auto-mute, frame-time governor, and WCAG 2.2 Three-Flashes safety logic.
- `src/renderers/ruler-lens.ts` — DuPeriod horizontal axis ($x = -d$), TPL transition zone ($10\text{--}40\text{ Hz}$), shape partial markers, and BandFilter window.
- `src/renderers/ring-clock-lens.ts` — Concentric DuPeriod spiral clock extending polar pitch representations across the limen.
- `src/renderers/cycle-wheel-lens.ts` — Circular polyrhythmic cycle wheel with spokes at coincidences, sample-accurate sweep playhead, and ghost fundamental cycle boundaries.
- `src/renderers/waveform-phasor-lens.ts` — Composite travelling wave simulation with rotating partial phasors.
- `src/renderers/prime-profile-lens.ts` — Prime harmonic spectrum bars partitioned by 2, 3, 5, 7, 11, and >11 prime families.
- `src/renderers/event-lanes-lens.ts` — Horizontal partial ticker lanes with composite collision ripple track.
- `src/renderers/alignment-meter-lens.ts` — Real-time Plomp-Levelt sensory roughness curve and Tenney harmonic complexity meter.

## Local Contracts

- **60 FPS Performance Target**: Drawing routines execute within a strict ~16.6ms per-frame budget.
- **Zero Software Blurs**: `ctx.shadowBlur = 0` in per-frame animation loops. Optical bloom and halation are offloaded to the WebGL shader pipeline.
- **Preallocated Buffers**: Zero heap object allocations in high-frequency particle and heightfield loops.
- **Photosensitivity / Flash Safety**: Partials $\le 3\text{ Hz}$ emit discrete beat ripples/shockwaves; partials $> 3\text{ Hz}$ smoothly blend into continuous steady-state Solfège-tinted glow and rotating phasors.
