# Audio Domain & AudioWorklets

## Purpose

The `src/audio` domain owns all real-time Web Audio API synthesis, the master-phase AudioWorklet processor, continuous crossing kernels across the Temporal-Place Limen (TPL), poetic percussion synthesis, and small-speaker virtual bass assist.

## Ownership

- `src/audio/worklets/spectrum-synth.worklet.ts` — High-performance `AudioWorkletProcessor` with continuous master-phase accumulators per placed shape, exponential-smoothed frequency integration, raised-cosine crossing grain, and percussion voice synthesis.
- `src/audio/audio-engine.ts` — `AudioContext` lifecycle manager, user-gesture unlock (iOS Safari compatibility), real-time window blur auto-muting, message port communication with the worklet, small-speaker assist filter graphs, and `buildAudioPayloadShapes` (scene → worklet payload).
- `src/audio/midi-manager.ts` — Web MIDI permission check, silent auto-connect, input device binding, focus-safe note release, and note-on/note-off event dispatch.
- `src/audio/pitch-capture.ts` — Microphone pitch capture via the McLeod Pitch Method (MPM) for the capture modal.
- `src/audio/__tests__/audio.test.ts` — Node-environment tests: substring assertions over the worklet source (registration, master-phase integration, crossing thresholds, ADSR) and payload construction via `buildAudioPayloadShapes` / `AudioEngine`. No real `AudioContext` is available.
- `src/audio/__tests__/worklet-filter-parity.test.ts` — Parity test suite verifying identical onset gating, supercycle evaluation, and fuzzy logic between core evaluation and the worklet implementation.

## Worklet Source Caveat

- The worklet is exported as a **JavaScript template string** (`SPECTRUM_WORKLET_CODE`) and loaded through a Blob URL, falling back to a base64 `data:` URL. Its body is **not type-checked or linted**.
- Inside the string: plain JavaScript only (no TypeScript syntax, no imports), escape backticks and `${`, and keep it self-contained.
- `audio.test.ts` asserts on literal substrings (e.g. `masterPhaseIncrement = f0 * sampleDt;`). Renaming or reformatting those lines requires updating the tests in the same change.

## Local Contracts

- Master phase $\Phi \in [0, 1)$ must be shared across all rational partials of a shape. Individual oscillator phase drift is strictly prohibited.
- Audio synthesis in the AudioWorklet must remain under ~2.5ms per 128-sample quantum.
- Real-time Focus: Auto-mute all synthesis immediately on window blur or tab visibility change when focus mode is enabled.
- May import only from `src/core` (lint-enforced); never React, renderers, or components.
