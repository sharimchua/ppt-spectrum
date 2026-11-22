# PPT Spectrum Shapes (`ppt-spectrum`)

Interactive teaching instrument for **Prime Period Theory (PPT)** demonstrating how rhythm, pitch, harmony, and timbre are the same structural phenomenon—**ratios and amplitude events in time**—across the **Temporal-Place Limen** ($f_{\text{TPL}} \approx 25.8\text{ Hz} / 38.7\text{ ms}$).

## Key Capabilities

- **Natural Timeline Continuum (Slower on Left, Faster on Right)**: Slider and ruler axes follow left-to-right orientation ($x = -d$). Slower rhythmic macro cycles (BPM / ms) sit on the left; faster micro pitch frequencies (Hz / semitones) sit on the right.
- **Sample-Accurate Audio-Visual Sync**: `AudioWorklet` broadcasts real-time phase telemetry to the render thread. Cycle Wheel sweep playheads, wave travel, and phasor rotations lock 1:1 with audio clicks and pulses in the rhythmic regime ($\le 25.8\text{ Hz}$).
- **Modular Flexbox Layout Engine & In-Place Editor**:
  - Split any lens cell horizontally or vertically, duplicate, reorder, or remove cells.
  - Deep-link sharing via URL-safe Base64 slugs (`?layout=<slug>` and `#layout=<slug>`).
  - Preconfigured layouts: Solo Ruler, Stacked Duo, Side-by-Side Duo, Teaching Trio, Phasor Studio, and All Lenses Quad.
- **Comprehensive Multi-Lens Suite**:
  - **Spectrum Ruler Lens**: Continuous DuPeriod continuum axis ($x = -d$), shaded TPL zone ($10\text{--}40\text{ Hz}$), draggable shape fundamental and filter window.
  - **Ring Clock Lens**: Concentric DuPeriod spiral clock showing octave bands and Solfège degree spokes.
  - **Cycle Wheel Lens**: Circular period wheel displaying each partial as a ring of event nodes, radial spokes at coincidences, and synchronized playhead sweep.
  - **Waveform & Phasor Lens**: Dynamic composite travelling wave simulation paired with rotating partial phasors.
  - **Prime Profile Lens**: Prime harmonic spectrum bars categorised by 2, 3, 5, 7, 11, and >11 prime families.
  - **Event Lanes Lens**: Horizontal ticker lanes for partial pulses with a composite collision ripple track.
  - **Alignment Meter Lens**: Real-time Plomp-Levelt sensory roughness curve, Tenney harmonic complexity, and ghost fundamental period ($sam$).
- **Compound Filters & Reductive Rhythm Sieves**:
  - Unified filter architecture supporting compound **Range Conditions** (absolute frequency in Hz, cents, DuPeriod $d$, or ratio relative to scene/anchor fundamental like Just M3 5/4 to 12-TET 400¢) and **Cycle Conditions** (N-division grids, slot weighting, Euclidean generators, rotation offsets, and multi-measure Supercycles).
  - Reductive rhythm sieve methodology: subtractively carve out syncopated beat patterns from dense polyrhythmic grids.
  - Full-spectrum operation: discrete onset gating in rhythm space, click-free amplitude modulation and acoustic formant shaping in pitch space.
  - Dedicated mobile bottom sheet and desktop drawer (`FiltersSheet`), radial menu segment, and HUD controls (`Shift+F`).
- **Generalized 2-Layer Tuning Systems & World/Microtonal Lattices**:
  - **Layer 1 (Tuning System Lattice)**: Supports Prime Family matrices (`12-TET`, `DuTri Closure`, `PPT Native`, `3-Limit Just (Tri)`, `5-Limit Just (Qui)`, `7-Limit Septimal (Sep)`), N-step ratio chains (`Pythagorean 3:2 Chain` with Upward `0..N−1` or Centred `−k..+k` modes across 12, 19, 31, or 53 steps), Equal Divisions (`24-EDO Quarter-Tone`, `31-EDO Meantone/Septimal`, `53-EDO Holderian`), explicit world lattices (`Javanese Gamelan Pélog 7-Tone` and `Sléndro 5-Tone`), and non-octave periods (`Bohlen-Pierce 13-Step 3:1 Tritave`).
  - **Layer 2 (Tuning Subset / Scale Sieve)**: Sieve any tuning system into musical subsets (`Pentatonic`, `Blues`, `Whole-Tone`, `Heptatonic / Diatonic`, `Octatonic`, `Nonatonic`, `31-EDO Meantone & Septimal`, `24-EDO Maqam Rast / Bayati / Hijaz`, `Pélog Pathet Nem & Barang`) or toggle individual degrees.
  - **Layer 3 (Physical Key / MIDI Projection & World Anchors)**: Project 12-key keyboards and fretboards via `Nearest-12`, `Step: System`, or `Step: Subset`, and anchor `Do` in Pitch and Rhythm Space to standard 12-TET pitches or historical/world frequencies (`TPL Mirror 412.8 Hz`, `Verdi C4 = 256 Hz`, `Baroque A415`, `432 Hz`, `Hindustani Sa`, `Turkish Ney`, `Javanese Tumbuk`, `Japanese Gagaku`).
- **Multi-Surface Instrument Panel & Algorithmic Scale Sequencer**:
  - **4 Playable Surfaces (`K`)**: Switch seamlessly between **12-Key Solfège Piano** (with stacked Harmonic-Geometry interval ratio bands), **Scale-Degree Strip** (relative to the active fundamental), **2D Isomorphic Lattice** (Hexagons or Squares across `Harmonic 3:2 × 5:4`, `Wicki-Hayden`, or `All-Fourths` layouts), and an interactive **SVG Guitar / Bass / Ukulele Fretboard** (9 tuning presets, custom per-string tuning, scale subset dimming, and Solfège / Note / Cents readouts).
  - **Dual-Coordinate Auto-Play Sequencer**: Built-in algorithmic scale arpeggiator (`Up`, `Down`, `Thirds`, `Fourths`, `Pendulum`, `Chromatic Approach`, and `Custom Steps` combining Layer 2 scale steps with Layer 1 chromatic offsets) with `Wrap`, `Bounce`, `Mirror`, and `Once` boundary rules, Tap Tempo, and canvas Strum Mode.
  - **Polarity-Aware Polyphony (`Tab` & `Hold H`)**: Latch chords in Pitch Space or polyrhythmic tempo streams in Rhythm Space (`Sam-Aligned` vs `Key-Strike` phase) and flip across the 25.8 Hz TPL horizon with a single keystroke.
- **Interactive Shape Partial Inspector & Synthesiser**:
  - Dedicated bottom tray sheet (`TraySheet`) to inspect, add, mute, or remove individual partials.
  - Mobile-first category filtering (`ShapePicker`), action toolbar (`ShapeActionsMenu`), and collapsible accordion Voice Anchor cards.
  - Acoustic ADSR envelope tab with responsive bezier curve visualisation, instrument presets, and harmonic damping slider.
  - Harmonic macro sliders: Acoustic Piano inharmonicity stretch ($f_n = n f_0 \sqrt{1 + B n^2}$) and spectral damping rolloff.
- **Rhythm & Pitch Capture Suite**:
  - On-screen tap pad with sample-clocked interval averaging and 11-limit DuPeriod rationaliser.
  - Microphone pitch capture via McLeod Pitch Method (MPM) $f_0$ tracking and candidate rationaliser.
- **Hardware-Accelerated WebGL Optics & Cosmetics**:
  - Single-draw-call `gl.POINTS` GPU particle engine for rhythmic sparks and fluid wave droplets.
  - Analytical expanding shockwaves on coincidences and landmark locks.
  - 16 dynamic Solfège-tinted optical light sources driving radial 35mm film halation, anamorphic and starburst diffraction lens flares.
  - 24fps procedural animated film grain, CRT scanlines, and barrel vignette.
  - Quick Rendering Cost Profiles (`Max Effects`, `Balanced`, `Eco Mode`) and WCAG 2.2 Three-Flashes compliance.
- **Settings & Cosmetics Drawer**:
  - Full control over optical shader cosmetics, CRT scanlines, background themes (`carbon-grid`, `studio-obsidian`, `cosmic-abyss`).
  - Real-time focus mode (auto-mutes audio and pauses heavy animation when tab is backgrounded).
  - TPL tuning anchors ($25.8\text{ Hz}$) and concert reference pitch ($440\text{ Hz}$).
- **Progressive Web App (PWA) & Offline Readiness**:
  - Offline-first Service Worker (`sw.js`) and Web App Manifest (`manifest.webmanifest`) allowing standalone offline operation on desktop and mobile.
- **Interactive Guide & Musical Thought Experiments (`?`)**:
  - Integrated 5-section interactive tutorial (`InfoModal`) with embedded playable diagrams and 25+ one-click live studio demos covering: (1) *Start Here & Demos*, (2) *How It Works — 7 Thought Experiments*, (3) *Under the Hood — Sound Design, Sieves & Sampling*, (4) *Tuning Systems & Playable Surfaces*, and (5) *Controls, Shortcuts & Learning Portal*.

## Project Structure & Architecture

```text
src/
├── core/         # Pure TypeScript mathematical models (axis, rational, alignment, shape, presets, layout-models)
├── audio/        # Web Audio API, AudioEngine, and master-phase AudioWorklets
├── renderers/    # 60 FPS Canvas 2D lenses, RenderCoordinator, CosmeticsEngine, WebGL shader pipeline
└── components/   # React 18 UI, 4-layer SpectrumViewport, ControlToolbar, SettingsDrawer, TraySheet, Modals
```

## Getting Started

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run unit tests
npm test

# Lint (architectural guardrails) and full pre-commit check
npm run lint
npm run check   # typecheck + lint + tests

# Production build
npm run build
```

Contributor and AI-agent working contracts live in the [AGENTS.md](AGENTS.md) hierarchy.

## Documentation

- [North-Star Design Spec](docs/design-spec.md)
- [Prime Period Theory Official Reference](https://ppt.midlifemuso.com/reference/)
- [Midlife Muso Music Pedagogy](https://midlifemuso.com)
