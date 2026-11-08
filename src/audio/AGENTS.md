# Audio Domain & AudioWorklets

## Purpose

The `src/audio` domain owns all real-time Web Audio API synthesis, the master-phase AudioWorklet processor, continuous crossing kernels across the Temporal-Place Limen (TPL), poetic percussion synthesis, and small-speaker virtual bass assist.

## Ownership

- `src/audio/spectrum-synth.worklet.ts` — High-performance `AudioWorkletProcessor` with continuous master-phase accumulators per placed shape, exponential-smoothed frequency integration, raised-cosine crossing grain, and percussion voice synthesis.
- `src/audio/audio-engine.ts` — `AudioContext` lifecycle manager, user-gesture unlock (iOS Safari compatibility), real-time window blur auto-muting, message port communication with the worklet, and small-speaker assist filter graphs.
- `src/audio/__tests__/audio.test.ts` — Deterministic `OfflineAudioContext` tests verifying phase coherence, zero click discontinuities on sliding, and master phase alignment.

## Local Contracts

- Master phase $\Phi \in [0, 1)$ must be shared across all rational partials of a shape. Individual oscillator phase drift is strictly prohibited.
- Audio synthesis in the AudioWorklet must remain under ~2.5ms per 128-sample quantum.
- Real-time Focus: Auto-mute all synthesis immediately on window blur or tab visibility change when focus mode is enabled.
