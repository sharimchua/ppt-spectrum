# PPT Spectrum Shapes: Design Spec (north star)

Working title: **Spectrum Shapes**. Status: draft v0.1, 9 Nov 2026, for review and iteration.

This is a north-star document. It states what the app is, why, and the model, behaviours and constraints that should hold. Sequencing, milestones and final technology choices are deliberately left to the architect. Items marked **[Decide]** are open questions collected in section 13.

---

## 1. Purpose, audience, principles

### 1.1 Purpose

An interactive teaching instrument for Prime Period Theory (PPT) that makes one claim tangible: rhythm, pitch, harmony and timbre are the same thing, **ratios and amplitude events in time**, seen at different timescales either side of the Temporal-Place Limen (TPL, about 25.8 Hz / 38.7 ms).

The core interaction: take a **shape** (a set of ratio-offset, amplitude-weighted periodic components) and **slide it along the spectrum**, hearing and seeing it turn from a polyrhythm with accents into a harmonic tone with a timbre, and back. Cyclical alignment (why some combinations "lock" and others don't) is shown at both rhythmic and harmonic levels.

### 1.2 Audience and contexts

- Students of Midlife Muso, from young learners to adults, taught in person (studio, on the road) and online.
- The teacher (Sharim) driving the app live while talking.
- Secondary: self-guided learners via shared links.

### 1.3 Design principles

1. **One primitive, two domains.** No separate "rhythm mode" and "pitch mode" objects. This mirrors the PPT component philosophy ([Component Philosophy](https://ppt.midlifemuso.com/reference/applications/component-philosophy)): a software object that needed a rhythm version and a pitch version would contradict the theory it demonstrates.
2. **Mobile-first, small form factor first.** Usable one-handed on a phone, in a noisy room, with headphones or a small speaker. Scales up to desktop for online lessons. See section 10.
3. **Many lenses, one scene.** The same state is shown through swappable modules, as in `ppt-visualiser`. Every lens is configurable, including its labels.
4. **Poetic license in sound, honesty in labelling.** The audio may be rendered for clarity (distinguishable layers, assisted low frequencies) provided the app can switch to a literal rendering and says which it is playing.
5. **Delight through the mic.** Tap a rhythm or play a note and watch the shape appear. Controls come first in build order but the mic interaction is the signature feature and should shape the architecture from day one.
6. **Descriptive, not prescriptive.** PPT is offered as a lens. The app must not present conventions (A440, 120 BPM, 12TET labels) as wrong, only show where they sit relative to PPT landmarks.
7. **Visual identity continuity.** Reuse the `ppt-visualiser` look and the canonical solfège colour palette, because students have said it is engaging, particularly younger ones.

### 1.4 Non-goals (for the north star)

- Polyphonic transcription from the mic. Capture is monophonic for pitch and single-stream for rhythm.
- A DAW, sequencer or notation editor (those exist in the PPT tool family; see Implementations in the [reference index](https://ppt.midlifemuso.com/reference/)).
- User accounts or a backend. Everything runs client-side; scenes are shared as links (section 11.6).
- Complete spectral analysis. PPT's own scope note says real timbres contain partials beyond the 11-limit and that dedicated spectral tools cover those; the app should capture them but not claim to model timbre exhaustively.

---

## 2. Concept and vocabulary

### 2.1 The idea in one paragraph

A **shape** is a set of **partials**. Each partial has a **frequency ratio** to the shape's fundamental and an **amplitude** relative to the fundamental. The shape has a **placement** on the spectrum axis, which is the position of its fundamental. Sliding the placement multiplies every frequency by the same factor, which on a log axis is a rigid translation of the whole pattern. Below the limen the partials are perceived as layered rhythms with accents; above it, as a tone with a timbre; across it, as something in between.

### 2.2 Terminology (the "emitter" question)

The working term "emitter" needs replacing or confirming **[Decide]**. Options:

| Term | For | Against |
|---|---|---|
| **Partial** | Correct acoustic term; already used on the PPT Timbre and Rhythmic Overtone pages; scales to inharmonic cases | Sounds pitch-biased to a rhythm student |
| **Layer** | Natural for rhythm talk ("the 3-layer against the 2-layer") | Weak for the pitch side |
| **Voice** | Friendly | Collides with polyphony and with synthesis "voices" |
| **Ray / tine** | Fits the visual (rays, combs) | No established meaning |

Recommendation: **partial** as the formal and code term, **layer** as optional classroom label. Avoid Thread, Knot, Coil, Weave and Cast, which PPT already uses for the Tapestry hierarchy and the Period model. The UI should allow the label set to be switched, like any other label.

In this spec, "partial" is used throughout; the data model keeps the term in one place so a rename is cheap.

### 2.3 Key derived concepts

- **Ghost fundamental.** For a set of rational-ratio partials, the greatest common frequency divisor. In rhythm it is the cycle or bar (the point where everything lands together, the sam). In pitch it is the virtual pitch (the "missing fundamental"), for example the root an octave below a perfect fifth. One object, two perceptions.
- **Interference partials.** Near-coincident partials from different shapes beat at their difference frequency. These beats lie in the rhythm region even when the parents are in pitch space, so roughness is visibly rhythm. Derived partials are drawn, flagged as derived, and optionally audible.
- **Coincidence.** Moments (rhythm) or phases (pitch) when partials align. Consonance is shown as the regularity and shortness of the alignment cycle.
- **Prime spectral profile.** The distribution of prime families (2, 3, 5, 7, 11, beyond) across a shape's partial indices, weighted by amplitude. Defined on the [Rhythmic Overtone Series](https://ppt.midlifemuso.com/reference/domains/rhythmic-overtone-series) page; here it is computed for any shape and compared between shapes.

---

## 3. What the app takes from PPT

| PPT concept | Source page | Role in the app |
|---|---|---|
| Core thesis: music as amplitude over time; pitch/rhythm boundary is perceptual, not structural | [Reference index](https://ppt.midlifemuso.com/reference/) | Product premise; the limen is a first-class landmark |
| Temporal-Place Limen: about 25.8 Hz, 38.7 ms, about 1548 BPM; transition zone about 10 to 40 Hz (flutter about 10 to 20 Hz, roughness about 20 to 40 Hz); upper limen about 20 kHz | [Temporal-Place Limen](https://ppt.midlifemuso.com/reference/perception/temporal-place-limen) | Anchor of the axis; shaded zone on the ruler; crossfade region in the sound engine |
| Metric DuPeriod: log2 period ruler, bands from about -10 to +10, `[Syllable][offset]` addresses | [Metric DuPeriod](https://ppt.midlifemuso.com/reference/reference/metric-duperiod) | Axis, rings, labels |
| Rhythmic overtone series: inter-onset ratio spectrum has the same structure as the harmonic series | [Rhythmic Overtone Series](https://ppt.midlifemuso.com/reference/domains/rhythmic-overtone-series) | Basis for harmonic shapes in rhythm; prime profiles; consonance as spectral overlap |
| Timbre as amplitude-weighted micro-polyphony; clarinet odd-prime dominance; bells beyond the 11-limit; filters as removal of high-prime partials | [Timbre](https://ppt.midlifemuso.com/reference/domains/timbre) | Presets, band filter semantics, the "accent equals amplitude" equivalence |
| Do to So (3:2) as fifth and as hemiola; rhythmic tritone; rhythmic 2-5-1 | Metric DuPeriod page above | Teaching scripts; labels for polyrhythm ratios |
| One `<ppt-period>` primitive for both pitch and rhythm; EventBus; composition over configuration | [Component Philosophy](https://ppt.midlifemuso.com/reference/applications/component-philosophy) | Lens architecture (section 11.2) |
| Universal anchors, conventional units as translation layers (the Kelvin/Celsius analogy) | TPL page above | Dual-label rulers (section 5.2) |

Pages listed in the reference index that the architect should read before building, and which the author of this spec did **not** read in full: [Period](https://ppt.midlifemuso.com/reference/foundations/period), [Prime Lattice](https://ppt.midlifemuso.com/reference/foundations/prime-lattice), [Rhythmic Phase Coherence](https://ppt.midlifemuso.com/reference/domains/rhythmic-phase-coherence), [Rhythmic Undertone Series](https://ppt.midlifemuso.com/reference/domains/rhythmic-undertone-series), [Polymetric Phase Equivalence](https://ppt.midlifemuso.com/reference/domains/polymetric-phase-equivalence), [Envelopes](https://ppt.midlifemuso.com/reference/reference/envelopes), [Amplitude Notation](https://ppt.midlifemuso.com/reference/reference/amplitude-notation), [Geometric Amplitude Ratios](https://ppt.midlifemuso.com/reference/extended/geometric-amplitude-ratios), [Amplitude Trajectories](https://ppt.midlifemuso.com/reference/extended/amplitude-trajectories), [Spectral Dynamic Coupling](https://ppt.midlifemuso.com/reference/extended/spectral-dynamic-coupling), [Prime Harmonic Profiles](https://ppt.midlifemuso.com/reference/extended/prime-harmonic-profiles), [Metric DuPeriod, Extended Range](https://ppt.midlifemuso.com/reference/extended/metric-duperiod-extended), [TPL Reference Tuning](https://ppt.midlifemuso.com/reference/tuning/temporal-place-limen-reference-tuning), [Design System and Colour Semantics](https://ppt.midlifemuso.com/reference/specifications/design-system), [PPT Component Library](https://ppt.midlifemuso.com/reference/implementations/ppt-components), [PPT-CF composition format](https://ppt.midlifemuso.com/reference/specifications/composition-format), [Play-Along Feedback](https://ppt.midlifemuso.com/reference/applications/play-along). The canonical machine-readable source is the [OKF bundle](https://ppt.midlifemuso.com/okf-bundle.txt) (`okf/index.md` in the [prime-period-theory repo](https://github.com/sharimchua/prime-period-theory)).

---

## 4. Data model and axis mathematics

### 4.1 The axis

Define the continuous **coordinate** `d` (offset in DuPeriods, a signed real number):

```
d = log2( period / period_TPL ) = log2( f_TPL / f )        f_TPL ≈ 25.8 Hz (configurable constant), period_TPL ≈ 38.76 ms
f = f_TPL * 2^(-d)
```

- `d > 0`: slower than the limen (rhythm). `d < 0`: faster (pitch). `d = 0` is the limen itself.
- **Display orientation:** put faster on the right (x = -d), so higher pitch and faster tempo both read left-to-right as "more". Slow, rhythmic content sits on the left.
- Useful landmarks on `d`: 10 Hz is d ≈ +1.37; 20 Hz is d ≈ +0.37; 40 Hz is d ≈ -0.63; so the transition zone spans about two octaves, d ∈ [-0.63, +1.37]. A4 = 440 Hz is d ≈ -4.09. 120 BPM (2 Hz, 500 ms) is d ≈ +3.69. Upper limen (20 kHz) is d ≈ -9.6. These numbers come from the constants on the TPL and Metric DuPeriod pages and should be recomputed from the constant in code, never hard-coded.
- **Band and position** (PPT address): with `n = floor(d)`, band = `n` if `d < 0` else `n + 1` (there is no band 0; d = 0 is the limen point), and fractional position = `12 * (d - n)` semitone-steps within the band. **See Open Question 2 on the direction of solfège labelling across the limen and on inconsistencies spotted on the Metric DuPeriod page before hard-coding labels.**
- Extended axis for macro cycles (minutes, hours, days, biological periodicity) follows the [Extended Range](https://ppt.midlifemuso.com/reference/extended/metric-duperiod-extended) page; the same `d` continues into positive values beyond about +10.

### 4.2 Core types (illustrative TypeScript)

```ts
// Exact where possible; real-valued for inharmonic shapes.
type Ratio =
  | { kind: 'rational'; num: number; den: number }   // reduced; small integers
  | { kind: 'real'; value: number };                 // frequency ratio to the shape fundamental

interface Partial {
  id: string;
  ratio: Ratio;          // frequency ratio to the fundamental (1 = the fundamental)
  amp: number;           // linear, relative to the fundamental (fundamental = 1). May be 0 (missing fundamental).
  phase: number;         // turns, 0..1, default 0
  kernel?: KernelParams; // how one cycle is rendered (section 6.3)
  voice?: VoiceId;       // audio voice assignment when in the rhythm region (section 6.4)
  label?: string;
  derived?: boolean;     // interference or ghost partials are computed, not authored
}

interface Shape {
  id: string;
  name: string;
  partials: Partial[];
  origin: 'preset' | 'user' | 'captured-pitch' | 'captured-rhythm';
}

interface Placement {
  shapeId: string;
  d: number;             // position of the fundamental on the axis
  gain: number;
  mute: boolean;
  solo: boolean;
}

interface Scene {
  placements: Placement[];       // 1..n shapes (n=2 enables consonance/alignment views)
  filter: BandFilter;            // section 7
  anchors: AnchorConfig;         // limen constant, tonic, tuning reference
  lenses: LensConfig[];          // per-module state, including label sets
  audio: AudioConfig;            // literal / poetic, voice map, master gain
}
```

Partial position for placement `p` and partial `i`: `d_i = p.d - log2(r_i)` and `f_i = f_TPL * 2^(-d_i)`. The shape is therefore a fixed pattern of offsets `-log2(r_i)` that slides rigidly. Amplitudes are independent of position by default; per-position amplitude modifiers (for example the low-frequency rolloff of small speakers) belong to the audio layer, not the shape.

### 4.3 Rational handling

- Prefer exact rationals for harmonic and prime-limit shapes so the ghost fundamental and cycle length are exact. Store reduced `num/den`; cap magnitude (for example both under 10^4) and fall back to `real`.
- Ghost fundamental for rational partials `r_i = n_i/d_i` at fundamental `f0`: let `D = lcm(d_i)`, `m_i = n_i * D / d_i`; then `g = f0 * gcd(m_i) / D`, and the common cycle is `1/g`. Example: ratios 3 and 2 give `m = (3, 2)`, `D = 1`, `g = f0`.
- Across two or more shapes, convert all partials to `f_TPL * 2^(-d)` form, rationalise against a tolerance (for example 5 cents for pitch; looser for rhythm, informed by the [Rhythmic Phase Coherence](https://ppt.midlifemuso.com/reference/domains/rhythmic-phase-coherence) page), then apply the same gcd. If no cycle shorter than a configurable bound exists, report "no short cycle" (the visual and numeric signature of dissonance or irrational relation).

### 4.4 Consonance and alignment metrics

Provide a small set, each documented in the UI, since no single number is "the" consonance:

1. **Cycle length** from the ghost fundamental: `1/g` (seconds, beats at the current scale, or DuPeriod).
2. **Complexity of ratio:** Tenney height `log2(n*d)` of the reduced ratio between fundamentals; prime-limit of the ratio.
3. **Coincidence count:** number of partial-pair alignments within a tolerance window per cycle (pitch: partials within X cents; rhythm: events within X ms or a fraction of the beat).
4. **Prime overlap:** similarity of the two shapes' prime spectral profiles (the PPT claim that shared prime families feel related).
5. **Sensory roughness** (pitch region): a pairwise model such as the Plomp-Levelt curve as parameterised by Sethares. The frequency-perception app already has Bark/critical-band logic; reuse it. Commonly cited constants are `b1 = 3.5`, `b2 = 5.75`, `D* = 0.24`, `s1 = 0.0207`, `s2 = 18.96`; these were recalled, not re-verified, so check them against [Sethares' page](https://sethares.engr.wisc.edu/consemi.html) before use.

Sliding one shape against a fixed copy and plotting total roughness against the interval gives a **dissonance curve**, the Sethares construction showing that the intervals that sound smooth depend on the timbre. Across the limen the same plot becomes a "rhythmic consonance" curve, which is new territory and a good headline demo.

---

## 5. Lenses (views)

Each lens is a module that reads the Scene and a shared transport clock, renders independently, and exposes its own configuration (labels, scale, density, colour mode). Lenses can be tabbed, swiped or tiled according to layout (section 10).

### 5.1 Lens catalogue

| Lens | What it shows | Primary use |
|---|---|---|
| **Ruler** (default) | Horizontal log axis in DuPeriods. Partials as markers whose height is amplitude. The limen as a vertical line with the 10 to 40 Hz transition zone shaded and flutter and roughness sub-zones. The shape is dragged and pinch-zoomed. The band filter is a draggable window on the same ruler. | First contact; the "slide" gesture; the filter |
| **Ring clock** | Concentric rings are DuPeriod bands; angle is solfège position (Do at 12 o'clock). Partials are dots; sliding is a spiral; octave jumps move ring only. 12TET spokes with just-ratio dots slightly off the spokes (where diacritics matter). Extends the visualiser's pitch clock across the limen. | The "metric DuPeriod" view; pitch-class structure of a shape |
| **Cycle wheel** | One cycle as a circle; each partial as a ring of evenly spaced events; spokes at coincidences; ghost fundamental as the cycle boundary. Same `<ppt-period>` primitive as the tonal clock. | Polyrhythm; alignment; accents as dot size |
| **Event lanes** | Scrolling lanes, one per partial, with ripples at events and a playhead; composite lane below. | Rhythm region; tap-along |
| **Waveform / phasor** | Composite waveform and rotating phasors per partial. | Pitch region; why partials fuse |
| **Alignment meter** | Numeric and graphical metrics from section 4.4, for two shapes. | Consonance vs dissonance |
| **Spectrum bars / prime profile** | Amplitude per partial plus prime-family bars. | Timbre talk; comparing instruments |

The first build should plausibly ship Ruler, Ring clock and Cycle wheel, since together they cover the pitch/rhythm duality in two different visual vocabularies, but sequencing is the architect's call.

### 5.2 Label sets

Labels are a layer, not a mode. A **label set** is a named list of landmarks with a scale; any lens can show zero or more label sets and the user chooses which:

- **PPT:** limen, upper limen, DuPeriod band numbers, solfège addresses (`So+4`).
- **Conventional pitch:** note names, A440 or other tunings (A415, A442 and others as data), octave numbers.
- **Conventional time:** BPM markers (for example 60, 120), ms, seconds, minutes.
- **Biological and macro:** heartbeat, breathing, and beyond (from the Extended Range page).
- **Landmarks:** limen, transition zone, perceptual landmarks from the Metric DuPeriod "perceptual landmarks in rhythmic space" table.

Showing **PPT and conventional together** produces a stacked ruler: DuPeriod octaves on one rail, Hz/BPM on another. This is the Kelvin/Celsius relationship from the TPL page made visible, and it lets a teacher show that 440 Hz and 120 BPM are conventions that sit near but not on prime landmarks. **[Decide]** the default label set for new students; recommendation: conventional first, PPT revealed by the teacher.

### 5.3 Colour

Use the canonical solfège palette (from the `ppt-visualiser` README) for pitch-class colour. Colouring each partial by its solfège position gives every harmonic shape a recognisable "colour chord" (partial 3 is So, deep blue; partial 5 is near Mi, yellow), which doubles as visual timbre identity. Fi is near-black (`#141414`), so it needs an outline or glow on dark backgrounds. Check the [Design System and Colour Semantics](https://ppt.midlifemuso.com/reference/specifications/design-system) page for any additional semantic rules.

### 5.4 Rendering constraints

- **Event rate versus frame rate.** At 60 fps you cannot draw per-cycle events above about 30 Hz. Above roughly 10 Hz the visual switches from event ripples to **phase and glow** representations (rotating phasors, brightness), which conveniently mimics the perceptual fusion the ear performs.
- **Flash safety.** See section 12.3: any visual with flashes above three per second must be limited by design.
- Use `devicePixelRatio`-aware canvas, with quality tiers (grain, bloom, trails) chosen by a frame-time governor, because the visualiser's effects are costly on phones.

---

## 6. Sound

### 6.1 Principles

Every audible element is derived from the Scene and a **single master phase** (section 11.3), so that exact ratios give exact alignment and audio and visuals agree.

### 6.2 Rendering regimes by frequency

For a partial at `f_i`, three regimes with a smooth crossfade (a smoothstep in `log2 f`) across the 10 to 40 Hz transition zone from the TPL page:

| Region | Perception | Rendering |
|---|---|---|
| Below about 10 Hz | Discrete events (rhythm) | Event voice: a short sound triggered each cycle at amplitude `amp` |
| About 10 to 40 Hz | Flutter, roughness | Both voices present with complementary gain (crossfade) |
| Above about 40 Hz | Fused tone (pitch) | Tone voice: sinusoid (or band-limited periodic wave) at `f_i` |

### 6.3 Kernel: what one cycle of a partial looks like

The central open sound-design question **[Decide]**: a partial is "an amplitude event repeating with period `1/f`", but a pure sine and a click train are different kernels with different spectra. Options for the architect to prototype:

- **A. Dual voice with crossfade** (above): click/sample voice below the limen, sine above. Simple, controllable, and each regime sounds natural. Risk: the crossfade may sound like two things swapping.
- **B. Unified pulse kernel:** every partial is a train of windowed grains whose width scales with the period; a wide, smooth grain approaches a sine, a narrow grain approaches a click. One mechanism, no regime switch. Risk: the "pitch" voice is no longer a pure sine, which complicates the 1-partial-equals-sine promise.
- **C. Kernel parameter:** expose a "sharpness" parameter per partial (pulse width as a fraction of the period) and let a preset or the teacher choose.

Prototype A and B early because this decision determines whether the crossing sounds like one continuous thing.

### 6.4 Voices in the rhythm region ("poetic license")

In rhythm mode each partial must be individually distinguishable. Provide a **voice map** (editable, saved in the preset):

- Distinct timbre or pitch per partial (for example low drum for the fundamental, progressively higher or brighter voices up the series) and optional stereo spread.
- Accent equals amplitude: loudness (and visual ripple size).
- A **literal mode** plays the plain physical rendering (same click for every partial; sines above the limen) so the teacher can contrast it with the poetic one. The UI states which mode is active.

### 6.5 Pitch region

- Additive synthesis: one oscillator per audible partial, gain from `amp * filter(d_i) * placement.gain`.
- Slide must be click-free: integrate phase continuously and smooth the control (exponential smoothing or portamento) rather than jumping frequency.
- Cap polyphony for phones (for example 16 partials default, 32 max, configurable).

### 6.6 Small-speaker assist

Phone speakers roll off below roughly 150 to 300 Hz, so a shape sliding down through the low pitch region will seem to vanish. Provide **speaker assist** (toggle, default on for mobile): synthesise low-order harmonics of sub-threshold partials (a virtual-bass technique) so the pitch remains perceptible. This also turns the **missing fundamental** into a demonstration: the ear reconstructs the ghost fundamental from the upper partials. Recommend headphones for lessons that involve the lowest bands. The rolloff figures are approximate; verify on target devices.

### 6.7 Derived and ghost partials

Interference partials (section 2.3) and the ghost fundamental can be rendered as optional "assist" layers in a distinct voice, off by default, so the student can hear what the ear is inferring.

---

## 7. Spectral band filter

A draggable **window on the axis** (same gesture as sliding the shape):

- Parameters: centre, width in octaves (or DuPeriods), edge softness. Modes: band-pass, low-pass, high-pass (open upper or lower edge).
- Applied **in the partial domain**, as a soft-edged gain by partial position, `g(d_i)` (for example a raised-cosine edge). This is exact, cheap on phones, and visually honest: filtered partials grey out. It applies equally to the rhythm region (selecting which layers are heard) and the pitch region (selecting which partials carry colour).
- It also applies to derived partials.
- Teaching intent: narrowing toward the fundamental collapses the sound toward a sine (the PPT Timbre page's account of low-pass filtering); a window over the rhythm region isolates layers; a window across the limen shows the crossing directly.
- Per-partial **solo and mute** are the same idea at finer grain.
- A true DSP filter on the mixed output (biquad nodes) is not needed for the north star, but the architect may add one for a "real instrument" feel on captured audio playback.

---

## 8. Input and mic capture

### 8.1 Controls (first-class, always available)

Drag to slide the shape; pinch to zoom the axis; handles to add, remove and re-weight partials; ratio and amplitude editors for precise work; snap points at landmarks (limen, tuning markers, BPM markers, solfège positions). Keyboard and mouse equivalents for desktop.

### 8.2 Mic capture, common requirements

- All analysis runs locally; no audio leaves the device (see section 12.4).
- Request `getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })`. These default-on voice-processing features distort tap transients and spectral balance. Use `getSupportedConstraints()` to detect which constraints the browser honours, since unsupported constraints are silently ignored. Requires a secure context (HTTPS) and a user gesture; the `AudioContext` must also be resumed by a user gesture (iOS Safari is stricter than most; unlock on first tap).
- Do the heavy lifting in an AudioWorklet or Worker, not the main thread.
- A **no-mic fallback** for rhythm: an on-screen tap pad (taps timestamped by the audio clock). It is more precise and useful in noisy rooms.

### 8.3 Note to shape (pitch capture)

1. **Detect f0.** Use a robust monophonic estimator on a time-domain window (2048 to 4096 samples): the McLeod Pitch Method via [pitchy](https://github.com/ianprime0509/pitchy) or YIN ([de Cheveigné and Kawahara 2002](https://doi.org/10.1121/1.1458024)). Accept only when clarity exceeds a threshold and f0 is stable within about 20 cents for a minimum duration.
2. **Average the spectrum** over the stable sustain using a large FFT (for example `AnalyserNode.fftSize` 16384 or 32768, about 1.3 to 2.7 Hz per bin at 44.1 to 48 kHz; use `getFloatFrequencyData` and convert dB to linear). Prefer a "hold to capture" or auto-capture-on-stability UX over live tracking.
3. **Pick partials** near `k * f0` with a tolerance (for example ±50 cents, wider for piano-like stretch), refine each peak by parabolic interpolation, and take amplitude ratios against the fundamental.
4. **Keep inharmonic peaks.** Also pick the strongest peaks globally; for each, store the real ratio to f0, and offer **snapping** to the nearest integer or prime-limit rational when within tolerance, otherwise keep as `real`. This preserves bells and idiophones.
5. **Missing fundamental.** If the fundamental is weak (small phone mics and speakers), keep its true low amplitude and display it; this is a feature, not an error.
6. **Output:** a `Shape` (origin `captured-pitch`) at a placement whose `d` matches the detected f0, plus its prime spectral profile.

### 8.4 Beat to shape (rhythm capture)

1. **Onsets.** Compute an onset-strength function (spectral flux on a short-time spectrum, hop about 5 to 12 ms) with adaptive thresholding and peak picking. The standard reference is [Bello et al. 2005](https://doi.org/10.1109/TSA.2005.851998) (A Tutorial on Onset Detection in Music Signals). Timestamp onsets from the audio sample clock, not from `performance.now`.
2. **Cycle.** Infer the cycle length `T` from inter-onset histograms and autocorrelation of the onset-strength function; choose the shortest `T` for which onset phases (`t mod T`) cluster. Use a tolerance informed by Rhythmic Phase Coherence.
3. **Quantise** each onset phase `(t mod T) / T` to a rational `p/q` with `q` limited to 11-limit-smooth denominators (prime factors in {2,3,5,7,11}) up to a small maximum. Use a cost that trades deviation against complexity (for example Tenney height). The 11-limit is the principled grid here, per the [11-limit statistical basis](https://ppt.midlifemuso.com/reference/extended/11-limit-statistical-basis) page.
4. **Decompose** the quantised onset set into evenly spaced partials: find sets of (period `T/n`, phase) pairs whose events cover the onsets, preferring few partials and low primes. **A single tap stream is genuinely ambiguous** (for example 3 against 2 and a hand-played 6-event pattern can coincide), so present a **ranked list of candidate decompositions** as selectable chips ("3 against 2", "even 6", ...). The ambiguity is itself a teaching moment.
5. **Amplitudes** from the normalised onset-strength at each tap; a partial's amplitude is the median of its events.
6. **Live refinement:** show a tentative shape after two cycles, firm up as taps accumulate; a "lock" gesture freezes it.
7. **Optional modulation-spectrum path:** for steady loops, take the spectrum of the amplitude or onset envelope over many cycles and peak-pick. This is the **same shape-extraction function** as the pitch path, applied at a slower timescale (spectrum of the signal gives the pitch-scale shape; spectrum of its envelope gives the rhythm-scale shape). It needs several cycles of steady playing, so it complements, rather than replaces, inter-onset analysis.

### 8.5 After capture

A captured shape is an ordinary Shape: it can be slid, filtered, saved as a preset, compared to another shape, or serialised into a shared link. Captured shapes should also expose "snap to prime-limit rational" and "show deviation" (the PPD diacritic vocabulary for deviation from pure ratios is described on the Rhythmic Overtone page, so deviations can be named, not just shown).

---

## 9. Presets, grid markers, cycles

### 9.1 Shape presets

Presets are data (JSON), each with a voice map and a short teaching note. Starting points (to be replaced or refined by capture; values are approximate):

| Preset | Partial structure | Note |
|---|---|---|
| Pure tone / single beat | 1 partial | The 1-partial case from the brief |
| Saw-like | all integers, `amp = 1/k` | The idealised sawtooth spectrum (see Rhythmic Overtone page) |
| Square-like | odd integers, `amp = 1/k` | Odd-prime dominance |
| Clarinet-like | odd partials strong, even partials weak (not zero) | PPT Timbre page: even partials softer, not absent |
| Plucked string / guitar | all integers with a pluck-position parameter `p`; ideal pluck gives `amp ∝ sin(kπp) / k²` | Pluck at 1/n of the string removes every nth partial |
| Piano-like | near-harmonic with stretch `f_k = k f0 sqrt(1 + B k²)` | Inharmonicity coefficient `B` as a slider |
| Bell | inharmonic ratios; classic church-bell partials include a minor-third "tierce" (roughly 0.5, 1, 1.2, 1.5, 2) | Beyond the 11-limit per the Timbre page; confirm by capture |
| "Floating bars" | **[Decide]** meaning of this term; if it means free-free bars, partial ratios of about 1, 2.76, 5.40, 8.93 | Inharmonic idiophone |

Rhythm-side presets reuse the same shapes (the same data placed below the limen), plus a small library of classic polyrhythmic shapes (3:2, 4:3, 5:4, 5:3 per the Metric DuPeriod interval table), and accented variants. All presets can be placed anywhere on the axis.

### 9.2 Grid markers

Markers are data: `{ id, set, label, value, unit, kind }`, loaded as label sets (section 5.2). Seed sets: A440, A415, A442 and other tunings (and 432, which the Metric DuPeriod page uses as a comparison); common BPM (60, 90, 120, 140...); limen and upper limen; biological rates (heart, breath) from the Extended Range page; time-scale units (ms, s, min). The app should show, for any marker, its DuPeriod address and its nearest prime-lattice landmark.

### 9.3 Cycles and the scale selector

A **cycle selector** sets the visible axis range and the units on the second rail: audio (Hz, kHz), musical time (BPM, ms), human time (seconds, minutes), and the extended macro and biological range. Underneath, the axis is always `d`; only labels and window change. For temporo-space limen and extended-range concepts, follow the Extended Range page (not read in detail by the spec author).

### 9.4 Pedagogical hooks (non-binding)

- Heartbeat (about 1.2 Hz) as a note about eight octaves below A440.
- Do to So as a 3:2 polyrhythm and a perfect fifth in one scene, with the ghost fundamental drawn.
- Rhythmic 2-5-1: hold pitch content, move a cross-rhythm Re to So to Do.
- Amplitude-ratio exploration: a lens that shows partial amplitudes as ratios, connecting to the open question on the [Geometric Amplitude Ratios](https://ppt.midlifemuso.com/reference/extended/geometric-amplitude-ratios) page.
- Guided scenes: saved scenes with annotations, shareable by link for online students.

---

## 10. Mobile-first UI and layout

### 10.1 Layout model: stage and tray

- **Small screens:** one lens fills the stage; controls live in a bottom sheet (reachable by thumb); lenses switch by swipe or tabs. Primary controls (play, slide, capture) always visible; everything else collapsible.
- **Large screens:** lenses tile side by side; the tray becomes a side panel. The same modules and configuration, different layout config. Layouts should be data (a layout schema), as with the visualiser's modular approach (see its Balanced Duo, Clock Monument and Stream River layouts).
- Design at around 360 px wide first; verify at 320 px.

### 10.2 Touch and gestures

- Use **Pointer Events** for unified mouse, touch and pen. Set `touch-action: none` on canvases that handle drag and pinch so the browser does not hijack gestures ([MDN: touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action), [pinch-zoom with pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures)).
- One-finger drag slides the shape; two-finger pinch zooms the axis; long-press places a marker or edits a partial. Snap to landmarks with a visual (and where available haptic) cue. The Vibration API is not available on iOS Safari, so haptics are an extra, not a dependency.
- Minimum touch targets of about 44 px; controls out of the screen-edge gesture zones; respect safe-area insets; use dynamic viewport units.
- Inputs at 16 px or larger so iOS does not auto-zoom.

### 10.3 Platform constraints that shape features

- **Audio unlock:** create or resume the `AudioContext` on a user gesture ([AudioContext.resume](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume)). On iOS, also play a silent buffer within the gesture.
- **iOS silent switch:** Web Audio on iOS Safari can be muted by the ringer switch; confirm behaviour on target devices and add a visible "no sound?" hint.
- **Mic:** secure context, permission prompt per origin, and voice-processing off (section 8.2). Bluetooth headphones add latency; the app should note this for tap-along work.
- **Speaker bandwidth:** speaker assist (section 6.6) and a headphone suggestion.
- **Screen wake:** consider the Screen Wake Lock API (feature-detect) during lessons.
- **Install and offline:** deliver as a PWA (manifest and service worker; see [MDN PWA guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps) and [Workbox](https://developer.chrome.com/docs/workbox)) so it runs from the home screen and works offline in a studio or on the road.

### 10.4 Performance budgets

- Audio: the audio thread must stay well under the block deadline (about 2.9 ms per 128-frame block at 44.1 kHz) on a low-end phone, with 16 to 32 partials.
- Visuals: target 60 fps on mid-range phones with automatic degradation (disable grain, bloom, trails first); pause rendering when the tab is hidden; decouple draw loops from audio.

---

## 11. Implementation notes

### 11.1 Stack (indicative)

Match `ppt-visualiser` where sensible: Vite, TypeScript, Tailwind (from its repository files; its README does not name a UI framework). `frequency-perception` uses React 18, Radix and shadcn, Recharts, Vitest and Playwright. The architect should choose the UI layer; the core library should be framework-free. Canvas 2D is probably sufficient for lenses; use WebGL only if bloom-quality effects are required on desktop.

### 11.2 Architecture

```
core (pure TypeScript, no DOM)
  axis: d <-> Hz/period/BPM, band + solfège address, label sets
  shape: partials, rationals, algebra (translate, filter, merge), prime profile
  alignment: ghost fundamental, cycle, coincidences, Tenney height, roughness
  decompose: rhythm quantiser + decomposition candidates
  presets, markers, scene serialisation

audio (browser)
  AudioWorkletProcessor: emitter synthesis from master phase
  capture worklet: framing, onset-strength, f0 input buffers
  mic graph + transport clock (AudioContext time)

lenses (UI)
  registry; each lens: (scene, transport, config) -> view; own settings
  layout engine: stage/tray configs from data
  shared event bus (cf. the PPT EventBus / listen-id pattern)
```

- **Shared state:** a single Scene store (immutable updates, serialisable). Lenses are pure functions of Scene plus transport time. The audio engine subscribes to Scene changes and receives parameter updates.
- **Reuse of PPT components:** the PPT Component Library ([register](https://ppt.midlifemuso.com/reference/implementations/ppt-components)) already defines `<ppt-period>` and step components and an EventBus. **[Decide]** whether lenses are built on that library (and thus remain editable at the markup level by teachers) or are native to this app with shared design tokens.
- **Scene serialisation:** consider the [PPT-CF](https://ppt.midlifemuso.com/reference/specifications/composition-format) composition format for layout serialisation, and a compact, versioned encoding of the Scene in the URL hash for sharing.

### 11.3 Master phase and sync

- One **master phase** per placed shape (the fundamental). Each partial's phase is `ratio * master + phase_offset`, so alignment is exact for rational ratios and does not drift (independent timers or oscillators drift).
- In the AudioWorklet ([MDN: AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)), keep one phase accumulator per shape and derive all partials from it in `process()`. Pass Scene changes by `port.postMessage` (or `AudioParam`s for continuous controls); avoid `SharedArrayBuffer` unless cross-origin isolation is accepted.
- Visuals read the same phase via a message from the worklet (or an `AnalyserNode` tap) and compensate for `AudioContext.baseLatency` and `outputLatency` where the browser exposes them. Never schedule visual events from `setTimeout`.
- Slide: smooth the target `d` (exponential smoothing) and integrate phase from the smoothed frequency so there are no discontinuities.

### 11.4 Event rendering above the frame rate

Implement the "phase and glow" fallback (section 5.4) in the lens layer as a function of the partial's frequency: below about 6 Hz draw discrete events; between about 6 and 25 Hz blend toward glow with strict flash limiting; above about 25 Hz show phasor and brightness only.

### 11.5 Capture pipeline placement

- Capture worklet streams fixed-size frames to a Worker or to the main thread for analysis: f0 (pitchy or YIN), FFT averaging (own implementation or `AnalyserNode`), onset-strength, and cycle and decomposition inference. Keep results as plain data returned to the core library.
- Consider established libraries for the heavy parts (candidates: pitchy, Essentia.js, Meyda, aubio.js) but treat dependency health carefully (pitchy is MIT and small but infrequently released). The core decomposition and prime-limit quantiser are PPT-specific and should be written in-house.

### 11.6 Sharing and persistence

- Local persistence of user presets and last scene (`localStorage` or IndexedDB, wrapped in try/catch).
- Share link encodes the Scene (shape or preset id, placement, filter, active lenses, label sets). Optional "teacher view" that hides advanced controls for a learner link.

---

## 12. Quality

### 12.1 Testing

- **Core:** unit tests (Vitest) on axis math round-trips, band and position addressing, rational arithmetic, gcd and ghost fundamental, prime profiles, quantiser and decomposition (including property-based tests: any generated union of evenly spaced layers should be recovered as one of the ranked candidates).
- **Audio:** deterministic tests with `OfflineAudioContext`; check that sliding is click-free (no discontinuities beyond a threshold) and that exact-ratio shapes realign every cycle without drift over long durations.
- **Capture:** synthetic audio (generated tap patterns with known ratios, accents and jitter; synthetic harmonic and inharmonic tones with noise) as golden inputs; plus a small corpus of real recordings (taps on a table, claps, voice, guitar, clarinet, a bell) recorded on target phones.
- **Device matrix:** at least one iOS and one Android phone, one tablet, and desktop Chrome, Safari and Firefox; small-speaker and headphone listening checks; Bluetooth latency check.
- **UI:** end-to-end tests (Playwright, as used by `frequency-perception`) for layouts at several viewports and touch gestures.

### 12.2 Accessibility

Colour is never the only carrier of meaning (also use shape, position and labels; the palette uses red and green hues). Respect `prefers-reduced-motion`. Provide text equivalents for the key readouts (cycle length, ratio, address). Keyboard operability on desktop.

### 12.3 Photosensitivity

Rendering rhythm-rate events at 3 to 30 Hz is exactly the flicker band associated with photosensitive seizures. Follow WCAG's [Three Flashes or Below Threshold](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html): no more than three flashes per second, or flashes below the general and red flash thresholds. Practical rule: above about 3 Hz, partial events are drawn as smooth glow or phasor rotation, not full-brightness on/off flashes, with a global "gentle visuals" switch. This matters particularly for young learners.

### 12.4 Privacy

Mic audio and captures stay on the device; nothing is uploaded; no analytics on audio content. State this in the mic permission prompt UI. Shared links contain shapes and settings only, never audio.

---

## 13. Open questions and decisions for the architect

1. **Terminology.** Partial vs layer vs other (section 2.2).
2. **Solfège direction and PPT page inconsistencies (needs the author's check before labels are hard-coded).**
   - Within a band, solfège positions are defined on period ratios (Do at the floor period, So at 3:2 of the period). In pitch space that makes So a fifth *below* the band's Do in frequency terms, whereas in pitch space So is normally a fifth *above*. The app must pick a labelling rule that is consistent across the limen (for example label by pitch-class in the pitch region and by period ratio in the rhythm region, or invert one) and the PPT pages should state it.
   - The Metric DuPeriod overview example (`So+4` described as about 600 ms, about 100 BPM) disagrees with the same page's +4 table (So at about 464 ms, about 129 BPM).
   - The "conventional units" table disagrees with the band table by my arithmetic: 60 BPM (1000 ms) falls in band +5, not +4; 120 BPM (500 ms) falls in band +4, not +3; 440 Hz (2.27 ms) falls in band -5 at about 10.9 semitone-steps (near Ti), not La in band -4. Either the table or my reading of the convention is off.
   - Related: the TPL anchor of 25.8 Hz is about 10 cents flat of G#0 (25.96 Hz), so "Do" at the limen does not coincide with D. See also the [TPL Reference Tuning](https://ppt.midlifemuso.com/reference/tuning/temporal-place-limen-reference-tuning) page.
3. **Kernel strategy** for the pitch/rhythm crossing: A, B or C (section 6.3).
4. **Ring clock tonic.** Limen-anchored Do, D (the visualiser's default), or a user choice; default for new students.
5. **Emitter as sinusoid or as pulse train**, and how this interacts with the "1 partial = pure sine" promise and with Fourier-style interpretation of captured rhythm.
6. **Real-valued ratios.** Confirm that inharmonic shapes are first-class and that snapping to prime-limit rationals is optional (recommended).
7. **Default label set** for new students (conventional first, PPT revealed?).
8. **Reuse of the PPT Component Library and PPT-CF** for lenses and scene serialisation (section 11.2).
9. **What "floating bars" means** (section 9.1).
10. **Photosensitivity policy**: confirm the three-flash rule as a hard constraint, with a global gentle-visuals mode.
11. **Scope edges.** Whether any of these are in scope for the north star: MIDI input or output, recorded playback of captured audio, exporting a shape to other PPT tools, polyphonic or multi-note capture, shared multi-user sessions for online lessons.
12. **Data licensing for presets** captured from real recordings (own instruments only is simplest).

---

## 14. References

Opened and used in preparing this spec:

**PPT and the author's projects**
- [PPT reference index / Knowledge Bundle](https://ppt.midlifemuso.com/reference/)
- [Temporal-Place Limen](https://ppt.midlifemuso.com/reference/perception/temporal-place-limen)
- [Metric DuPeriod](https://ppt.midlifemuso.com/reference/reference/metric-duperiod)
- [Rhythmic Overtone Series](https://ppt.midlifemuso.com/reference/domains/rhythmic-overtone-series)
- [Timbre and Spectral Periodicity](https://ppt.midlifemuso.com/reference/domains/timbre)
- [Component Philosophy](https://ppt.midlifemuso.com/reference/applications/component-philosophy)
- [ppt-visualiser](https://github.com/sharimchua/ppt-visualiser) (live at ppt-visualiser.vercel.app)
- [frequency-perception](https://github.com/sharimchua/frequency-perception) (live at frequency-perception.midlifemuso.com)

**Audio and signal processing**
- [MDN: AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)
- [MDN: AnalyserNode.getFloatFrequencyData](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getFloatFrequencyData)
- [MDN: MediaTrackSupportedConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSupportedConstraints) (echoCancellation, noiseSuppression, autoGainControl)
- de Cheveigné and Kawahara, [YIN, a fundamental frequency estimator for speech and music](https://doi.org/10.1121/1.1458024), JASA 111(4), 2002
- [pitchy](https://github.com/ianprime0509/pitchy) (McLeod Pitch Method, JavaScript, MIT)
- Bello et al., A Tutorial on Onset Detection in Music Signals, IEEE Transactions on Speech and Audio Processing 13(5), 1035-1047, 2005 (bibliographic details confirmed; the DOI link in section 8.4, 10.1109/TSA.2005.851998, was recalled and not checked)
- Sethares, [Relating Tuning and Timbre](https://sethares.engr.wisc.edu/consemi.html) and the book *Tuning, Timbre, Spectrum, Scale* ([overview](https://sethares.engr.wisc.edu/prelude.html)); dissonance curves and local consonance
- Plomp and Levelt, "Tonal consonance and critical bandwidth", JASA 38, 1965 (the basis of the roughness model; not opened)

**Mobile and platform**
- [MDN: touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action)
- [MDN: Pointer events, pinch zoom gestures](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures)

**Cited but not opened in this session (standard pages; check before relying on them)**
- [MDN: Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API), [AudioContext.resume](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume), [MediaDevices.getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [OfflineAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext)
- [MDN: Progressive web apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps), [Workbox](https://developer.chrome.com/docs/workbox)
- [WCAG 2.2: Three Flashes or Below Threshold](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)
- PPT pages listed at the end of section 3, the [OKF bundle](https://ppt.midlifemuso.com/okf-bundle.txt), and the [prime-period-theory](https://github.com/sharimchua/prime-period-theory) and [ppt-engraver](https://github.com/sharimchua/ppt-engraver) repos
- Tenney height and the missing fundamental (virtual pitch): standard psychoacoustics and tuning-theory concepts; no single canonical source was checked
