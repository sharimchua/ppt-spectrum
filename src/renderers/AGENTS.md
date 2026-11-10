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
-src/renderers/waveform-phasor-lens.ts — Composite travelling wave simulation with terminus horizon line and persistent onset afterglow.
- src/renderers/phasor-lens.ts — Hierarchical rotating epicyclic phasor arms, Voice Anchor radiating vectors, Solfège neon colours, and Apex coincidence marker.
- `src/renderers/prime-profile-lens.ts` — Prime harmonic spectrum bars partitioned by 2, 3, 5, 7, 11, and >11 prime families.
- `src/renderers/event-lanes-lens.ts` — Horizontal partial ticker lanes with composite collision ripple track.
- `src/renderers/alignment-meter-lens.ts` — Real-time Plomp-Levelt sensory roughness curve and Tenney harmonic complexity meter.

## Local Contracts

- **60 FPS Performance Target**: Drawing routines execute within a strict ~16.6ms per-frame budget.
- **Zero Software Blurs**: `ctx.shadowBlur = 0` in per-frame animation loops. Optical bloom and halation are offloaded to the WebGL shader pipeline.
- **Preallocated Buffers**: Zero heap object allocations in high-frequency particle and heightfield loops.
- **Photosensitivity / Flash Safety**: Partials $\le 3\text{ Hz}$ emit discrete beat ripples/shockwaves; partials $> 3\text{ Hz}$ smoothly blend into continuous steady-state Solfège-tinted glow and rotating phasors.
- **Lint-enforced**: no React or `src/components` imports; any `ctx.shadowBlur = <non-zero>` assignment is an error.

## Lens Contract

Every lens implements `RegisteredLensRenderer` (exported from `render-coordinator.ts`): a string `id` matching its `SpectrumLensType`, a `render(ctx, width, height, scene, transportTime, audioPhase?, isAudioActive?, labelMode?, configOverrides?, noteAge?)` method, and optionally `getDynamicLights()` to feed the WebGL light sources. `render` is called every frame by `RenderCoordinator` — no allocation, no React access.

## Playbook: Adding a New Lens

1. Create `src/renderers/<name>-lens.ts` exporting a class implementing `RegisteredLensRenderer`.
2. Add the id to the `SpectrumLensType` union in `src/core/layout-models.ts`, and its display title in the title lookup near the end of that file.
3. Instantiate it in the `switch (cell.module)` and add it to `lensOptions` in `src/components/CellViewport.tsx`.
4. Add it to the Ownership list above, and describe it in `InfoModal.tsx` and `README.md` where the other lenses are listed.
5. Extract pure geometry/maths helpers as named exports and unit test them in `src/renderers/__tests__/`.
6. Run `npm run check`.
