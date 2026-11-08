# PPT Spectrum Shapes (`ppt-spectrum`)

Interactive teaching instrument for **Prime Period Theory (PPT)** demonstrating how rhythm, pitch, harmony, and timbre are the same structural phenomenon—**ratios and amplitude events in time**—across the **Temporal-Place Limen** ($f_{\text{TPL}} \approx 25.8\text{ Hz} / 38.7\text{ ms}$).

## Key Capabilities

- **Single Continuum Axis**: Seamless continuous DuPeriod coordinate $d = \log_2(f_{\text{TPL}} / f)$, bridging rhythmic space ($d > 0$) and pitch space ($d < 0$).
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
- [Implementation Plan](https://ppt.midlifemuso.com/reference/)
- [Prime Period Theory Official Reference](https://ppt.midlifemuso.com/reference/)
