export const SPECTRUM_WORKLET_CODE = `
class SpectrumSynthProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.shapes = []; // Array of { shapeId, placementD, targetD, gain, mute, partials: [{ ratio, amp, phaseOffset, voice }] }
    this.masterPhases = new Map(); // shapeId -> phase in [0, 1)
    this.smoothedD = new Map(); // shapeId -> smoothed coordinate
    this.audioMode = 'poetic'; // 'poetic' | 'literal'
    this.masterGain = 0.75;
    this.tplHz = 25.8;

    // Poetic voice envelopes & triggers
    this.voiceStates = new Map(); // key -> { active, sampleIndex, decaySamples, pitchHz }
    this.noteStates = new Map(); // shapeId -> { noteAge, lastD, isKeyDown, isAuditioning, isReleased, releaseAge, releaseStartAmp, rhythmTurnsElapsed }
    this.isPlaying = false; // Transport playback state

    // Message throttle counter (~30-60 Hz telemetry back to render thread)
    this.telemetryCounter = 0;

    this.port.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'UPDATE_SCENE') {
        this.shapes = payload.shapes || [];
        this.audioMode = payload.audioMode || 'poetic';
        this.masterGain = payload.masterGain !== undefined ? payload.masterGain : 0.75;
        this.tplHz = payload.tplHz || 25.8;
        this.isPlaying = !!payload.isPlaying;
      } else if (type === 'SET_TARGET_D') {
        const { shapeId, targetD } = payload;
        this.smoothedD.set(shapeId, targetD);
      } else if (type === 'NOTE_ON') {
        const { shapeId } = payload || {};
        const targetIds = shapeId ? [shapeId] : (this.shapes.length > 0 ? this.shapes.map((s) => s.shapeId) : Array.from(this.noteStates.keys()));
        for (const id of targetIds) {
          let st = this.noteStates.get(id);
          if (!st) {
            st = { noteAge: 0, lastD: 0, isKeyDown: true, isAuditioning: true, isReleased: false, releaseAge: 0, releaseStartAmp: 1.0, rhythmTurnsElapsed: 0 };
            this.noteStates.set(id, st);
          } else {
            st.noteAge = 0;
            st.isKeyDown = true;
            st.isAuditioning = true;
            st.isReleased = false;
            st.releaseAge = 0;
            st.releaseStartAmp = 1.0;
            st.rhythmTurnsElapsed = 0;
          }
          if (!this.isPlaying) {
            this.masterPhases.set(id, 0.0);
          }
        }
      } else if (type === 'NOTE_OFF') {
        const { shapeId } = payload || {};
        const targetIds = shapeId ? [shapeId] : (this.shapes.length > 0 ? this.shapes.map((s) => s.shapeId) : Array.from(this.noteStates.keys()));
        for (const id of targetIds) {
          const st = this.noteStates.get(id);
          if (st) {
            st.isKeyDown = false;
            st.isReleased = true;
            st.releaseAge = 0;
          }
        }
      } else if (type === 'TRIGGER_NOTE') {
        const { shapeId } = payload || {};
        const targetIds = shapeId ? [shapeId] : (this.shapes.length > 0 ? this.shapes.map((s) => s.shapeId) : Array.from(this.noteStates.keys()));
        for (const id of targetIds) {
          let st = this.noteStates.get(id);
          if (!st) {
            st = { noteAge: 0, lastD: 0, isKeyDown: false, isAuditioning: true, isReleased: false, releaseAge: 0, releaseStartAmp: 1.0, rhythmTurnsElapsed: 0 };
            this.noteStates.set(id, st);
          } else {
            st.noteAge = 0;
            st.isKeyDown = false;
            st.isAuditioning = true;
            st.isReleased = false;
            st.releaseAge = 0;
            st.releaseStartAmp = 1.0;
            st.rhythmTurnsElapsed = 0;
          }
          if (!this.isPlaying) {
            this.masterPhases.set(id, 0.0);
          }
        }
      }
    };
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const channelLeft = output[0];
    const channelRight = output[1] || output[0];
    const numSamples = channelLeft.length;
    const sampleRate = globalThis.sampleRate || 44100;

    channelLeft.fill(0);
    if (channelRight !== channelLeft) {
      channelRight.fill(0);
    }

    if (this.masterGain <= 0.0001 || this.shapes.length === 0) {
      return true;
    }

    const phaseTelemetry = {};

    for (const shape of this.shapes) {
      if (shape.mute || shape.gain <= 0.0001) continue;

      const shapeId = shape.shapeId;
      let currentD = this.smoothedD.get(shapeId) ?? shape.placementD;
      const targetD = shape.placementD;

      // Note tracking for ADSR envelope & key-triggered audition
      let nState = this.noteStates.get(shapeId);
      if (!nState) {
        nState = { noteAge: 0, lastD: targetD, isKeyDown: false, isAuditioning: false, isReleased: false, releaseAge: 0, releaseStartAmp: 1.0, rhythmTurnsElapsed: 0 };
        this.noteStates.set(shapeId, nState);
      } else if (Math.abs(targetD - nState.lastD) > 0.05) {
        // Re-trigger envelope on intentional musical pitch step / bookmark jump
        nState.noteAge = 0;
        nState.lastD = targetD;
      }

      // Audible if continuous transport is running OR if shape is being auditioned via key T
      const isAudible = this.isPlaying || nState.isAuditioning;
      if (!isAudible) {
        phaseTelemetry[shapeId] = {
          masterPhase: this.masterPhases.get(shapeId) || 0.0,
          f0: this.tplHz * Math.pow(2, -currentD),
          smoothedD: currentD,
          noteAge: nState.noteAge,
          isAuditioning: false,
        };
        continue;
      }

      // Exponential smoothing toward targetD
      currentD += (targetD - currentD) * 0.08;
      this.smoothedD.set(shapeId, currentD);

      const f0 = this.tplHz * Math.pow(2, -currentD);
      let masterPhase = this.masterPhases.get(shapeId) || 0.0;
      const adsr = shape.adsr;

      // Idiomatic ADSR playback in pitch space:
      // Decaying shapes (piano, pluck, bell) ring out full sustain/decay, pause briefly, and auto-restrike during playback.
      // Infinitely sustained shapes (sine, square, saw, drone) sustain without auto-restrike.
      const isPitchSpace = f0 > 25.8;
      const isDecayingShape = adsr && (adsr.sustain < 0.7 || adsr.decay < 1.5);
      const autoStrikePeriod = isDecayingShape
        ? Math.max(1.0, adsr.attack + adsr.decay * 1.35 + 0.4)
        : 1e9;

      for (let s = 0; s < numSamples; s++) {
        const sampleDt = 1.0 / sampleRate;
        const masterPhaseIncrement = f0 * sampleDt;
        const prevPhase = masterPhase;
        masterPhase = (masterPhase + masterPhaseIncrement) % 1.0;
        nState.noteAge += sampleDt;

        if (nState.isReleased) {
          nState.releaseAge += sampleDt;
        }

        // In continuous transport playback, decaying instruments auto-restrike:
        if (this.isPlaying && isPitchSpace && isDecayingShape && nState.noteAge >= autoStrikePeriod) {
          nState.noteAge = 0;
          nState.isReleased = false;
          nState.releaseAge = 0;
        }

        // In rhythm space audition: count elapsed turns.
        // If key is released, let the rhythm finish the current full cycle (>= 1.0 turns) before stopping cleanly at the Apex.
        if (!isPitchSpace && nState.isAuditioning) {
          nState.rhythmTurnsElapsed += masterPhaseIncrement;
          if (!nState.isKeyDown && nState.rhythmTurnsElapsed >= 1.0 && (masterPhase < 0.06 || prevPhase > 0.94)) {
            nState.isAuditioning = false;
            masterPhase = 0.0;
          }
        }
        const noteAge = nState.noteAge;

        let sampleValL = 0;
        let sampleValR = 0;

        for (let pIdx = 0; pIdx < shape.partials.length; pIdx++) {
          const p = shape.partials[pIdx];
          if (p.amp <= 0.0001) continue;

          const ratioVal = p.ratio;
          const partialFreq = f0 * ratioVal;
          const partialPhase = (masterPhase * ratioVal + p.phaseOffset) % 1.0;

          // Perceptual regime weights across 10 - 40 Hz
          let toneWeight = 0.0;
          if (partialFreq >= 40.0) {
            toneWeight = 1.0;
          } else if (partialFreq > 10.0) {
            toneWeight = 0.5 * (1.0 - Math.cos(Math.PI * (partialFreq - 10.0) / 30.0));
          }
          const eventWeight = 1.0 - toneWeight;

          // Compute ADSR acoustic envelope in tone regime
          let env = 1.0;
          if (adsr && toneWeight > 0.001) {
            const att = Math.max(0.001, adsr.attack);
            const dec = Math.max(0.01, adsr.decay);
            const sus = Math.max(0.0, Math.min(1.0, adsr.sustain));
            const damp = adsr.damping !== undefined ? Math.max(0.0, adsr.damping) : 0.0;
            const rel = Math.max(0.04, adsr.release);

            if (noteAge < att) {
              const aRatio = noteAge / att;
              env = aRatio * aRatio * (3.0 - 2.0 * aRatio); // smooth hermite attack ramp
            } else {
              const decayElapsed = noteAge - att;
              // Higher partials decay faster via harmonic damping
              const tau = dec / (1.0 + damp * Math.max(0.0, ratioVal - 1.0));
              const expDecay = Math.exp(-decayElapsed / Math.max(0.005, tau));
              env = sus + (1.0 - sus) * expDecay;
            }

            // Key release behavior:
            // When key is released, apply release ramp down to zero
            if (nState.isReleased) {
              const relProgress = Math.min(1.0, nState.releaseAge / rel);
              env *= (1.0 - relProgress);
            } else {
              nState.releaseStartAmp = env;
            }

            // In pitch space audition when transport is paused, end audition when note is silent
            if (isPitchSpace && nState.isAuditioning && !this.isPlaying && (nState.isReleased || sus <= 0.05)) {
              if (env <= 0.0008) {
                nState.isAuditioning = false;
              }
            }
          } else if (!adsr && !this.isPlaying && nState.isAuditioning && nState.isReleased) {
            const relProgress = Math.min(1.0, nState.releaseAge / 0.15);
            env = Math.max(0, 1.0 - relProgress);
            if (env <= 0.0008) nState.isAuditioning = false;
          }

          // 1. Tone Component (Pure sinusoid shaped by dynamic ADSR envelope)
          let toneSample = 0;
          if (toneWeight > 0.001) {
            toneSample = Math.sin(2.0 * Math.PI * partialPhase) * p.amp * env * toneWeight;
          }

          // 2. Event / Pulse Component
          let eventSample = 0;
          if (eventWeight > 0.001) {
            if (this.audioMode === 'literal') {
              const pulseW = 0.08;
              if (partialPhase < pulseW) {
                eventSample = 0.5 * (1.0 - Math.cos(2.0 * Math.PI * (partialPhase / pulseW))) * p.amp * eventWeight;
              }
            } else {
              // Poetic Mode: pitched click on cycle wrap
              const wrapped = (partialPhase < 0.1 && (prevPhase * ratioVal) % 1.0 > 0.8);
              const voiceKey = shapeId + '_' + pIdx;
              let vState = this.voiceStates.get(voiceKey);
              if (!vState) {
                vState = { active: false, sampleIndex: 0, decaySamples: Math.floor(sampleRate * 0.08), pitchHz: 120 + pIdx * 80 };
                this.voiceStates.set(voiceKey, vState);
              }

              if (wrapped) {
                vState.active = true;
                vState.sampleIndex = 0;
              }

              if (vState.active) {
                const env = Math.max(0, 1.0 - vState.sampleIndex / vState.decaySamples);
                const clickOsc = Math.sin(2.0 * Math.PI * vState.pitchHz * (vState.sampleIndex / sampleRate));
                eventSample = clickOsc * env * p.amp * eventWeight * 1.5;
                vState.sampleIndex++;
                if (vState.sampleIndex >= vState.decaySamples) {
                  vState.active = false;
                }
              }
            }
          }

          const combined = (toneSample + eventSample) * shape.gain;
          const pan = Math.sin(pIdx * 1.2) * 0.35;
          sampleValL += combined * (0.5 - pan * 0.5);
          sampleValR += combined * (0.5 + pan * 0.5);
        }

        channelLeft[s] += sampleValL * this.masterGain;
        channelRight[s] += sampleValR * this.masterGain;
      }

      this.masterPhases.set(shapeId, masterPhase);
      phaseTelemetry[shapeId] = {
        masterPhase,
        f0,
        smoothedD: currentD,
        noteAge: nState.noteAge,
        isAuditioning: nState.isAuditioning,
      };
    }

    // Post telemetry to main thread approximately every 20-30ms (~12-16 quantums of 128 samples)
    this.telemetryCounter++;
    if (this.telemetryCounter >= 12) {
      this.telemetryCounter = 0;
      this.port.postMessage({
        type: 'AUDIO_SYNC',
        payload: {
          phases: phaseTelemetry,
          currentTime: currentTime,
        }
      });
    }

    return true;
  }
}

registerProcessor('spectrum-synth-processor', SpectrumSynthProcessor);
`;
