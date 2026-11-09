# PPT Spectrum Shapes (`ppt-spectrum`)

Interactive teaching instrument for **Prime Period Theory (PPT)** demonstrating how rhythm, pitch, harmony, and timbre are the same structural phenomenon—**ratios and amplitude events in time**—across the **Temporal-Place Limen** ($f_{\text{TPL}} \approx 25.8\text{ Hz} / 38.7\text{ ms}$).

## Key Capabilities

- **Natural Timeline Continuum (Slower on Left, Faster on Right)**: Slider and ruler axes follow left-to-right orientation ($x = -d$). Slower rhythmic macro cycles (BPM / ms) sit on the left; faster micro pitch frequencies (Hz / semitones) sit on the right.
- **Rich Presets**:
  - **Duple Meter (1:2)**: Octave relation in pitch, 2-layer backbeat in rhythm.
  - **Quadruple Meter (1:4)**: Double octave stack (1:2:4), 4/4 bar subdivision with hierarchical accents.
  - **Hemiola (3:2)**: The canonical PPT Do-to-So fifth in pitch, 3-against-2 polyrhythm in rhythm.
  - **Polyrhythms (4:3 and 5:4)**: Perfect fourth and pure Just major third.
  - **Acoustic Piano**: Struck string physics with inharmonic string-stiffness stretch ($f_k = k \cdot f_0 \sqrt{1 + B k^2}$ where $B \approx 0.0004$) and acoustic decay envelope.
  - **Sawtooth, Square, Clarinet, Plucked String, Church Bell, and Floating Free-Free Bars**.
- **Master-Phase Audio Synthesis**: High-performance `AudioWorklet` maintaining continuous phase coherence across exact rational harmonic shapes without phase drift or clicking discontinuities during sliding.
- **Continuous Perceptual Crossing Kernel**: Smooth crossfade across the $10\text{--}40\text{ Hz}$ transition zone (flutter and roughness) between discrete rhythmic impulses / poetic percussion and fused tonal sinusoids.
- **Hardware-Accelerated WebGL Optics & Cosmetics**: Full 4-layer viewport architecture ported from `ppt-visualiser`:
  - Single-draw-call `gl.POINTS` GPU particle engine for rhythmic sparks and fluid wave droplets.
  - Analytical expanding shockwaves on coincidences and landmark locks.
  - 16 dynamic Solfège-tinted optical light sources driving radial 35mm film halation, anamorphic and starburst diffraction lens flares.
  - 24fps procedural animated film grain, CRT scanlines, and barrel vignette.
  - Quick Rendering Cost Profiles (`Max Effects`, `Balanced`, `Eco Mode`) and WCAG 2.2 Three-Flashes compliance.

## Project Structure & Architecture

```text
src/
├── core/         # Pure TypeScript mathematical models (axis, rational, alignment, shape, presets)
├── audio/        # Web Audio API, AudioEngine, and master-phase AudioWorklets
├── renderers/    # 60 FPS Canvas 2D lenses, RenderCoordinator, CosmeticsEngine, WebGL shader pipeline
└── components/   # React 18 UI, 4-layer SpectrumViewport, and ControlToolbar
```

## Getting Started

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run unit tests
npm test

# Production build
npm run build
```

## Documentation

- [North-Star Design Spec](docs/design-spec.md)
- [Prime Period Theory Official Reference](https://ppt.midlifemuso.com/reference/)
