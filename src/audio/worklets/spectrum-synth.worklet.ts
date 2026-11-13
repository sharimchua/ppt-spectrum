export const SPECTRUM_WORKLET_CODE = `
class SpectrumSynthProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.shapes = []; // Array of { shapeId, placementD, targetD, gain, mute, partials: [{ ratio, amp, phaseOffset, voice, staticMatch }] }
    this.masterPhases = new Map(); // shapeId -> phase in [0, 1)
    this.smoothedD = new Map(); // shapeId -> smoothed coordinate
    this.audioMode = 'poetic'; // 'poetic' | 'literal'
    this.masterGain = 0.75;
    this.tplHz = 25.8;

    // Filter state & pre-allocated gate buffers
    this.filter = null;
    this.envelope = null;
    this.filterBuffers = new Map(); // shapeId -> { gateTarget: Float32Array, gateSmooth: Float32Array, lastOnsetIdx: Float64Array }

    // Poetic voice envelopes & triggers
    this.voiceStates = new Map(); // key -> { active, sampleIndex, decaySamples, pitchHz, gate }
    this.noteStates = new Map(); // shapeId -> { noteAge, lastD, isKeyDown, isAuditioning, isReleased, releaseAge, releaseStartAmp, rhythmTurnsElapsed }
    this.midiVoices = new Map(); // midiNote -> { midiNote, targetD, velocity, masterPhase, noteAge, isKeyDown, isReleased, releaseAge, currentAmp }
    this.isPlaying = false; // Transport playback state

    // Message throttle counter (~30-60 Hz telemetry back to render thread)
    this.telemetryCounter = 0;

    this.port.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'UPDATE_SCENE') {
        const wasPlaying = this.isPlaying;
        this.shapes = payload.shapes || [];
        this.audioMode = payload.audioMode || 'poetic';
        this.masterGain = payload.masterGain !== undefined ? payload.masterGain : 0.75;
        this.tplHz = payload.tplHz || 25.8;
        this.isPlaying = !!payload.isPlaying;
        const prevFilter = this.filter;
        this.filter = payload.filter || null;
        this.envelope = payload.envelope || null;
        const filterChanged = JSON.stringify(prevFilter) !== JSON.stringify(this.filter);

        // Allocate gate buffers for each shape's partials only when count changes
        for (let sIdx = 0; sIdx < this.shapes.length; sIdx++) {
          const sh = this.shapes[sIdx];
          const pCount = sh.partials ? sh.partials.length : 0;
          let buf = this.filterBuffers.get(sh.shapeId);
          if (!buf || buf.gateTarget.length !== pCount || filterChanged) {
            buf = {
              gateTarget: new Float32Array(pCount).fill(1.0),
              gateSmooth: new Float32Array(pCount).fill(1.0),
              lastOnsetIdx: new Float64Array(pCount).fill(-999999),
            };
            this.filterBuffers.set(sh.shapeId, buf);
          }
        }

        // If transport stopped, silence all active notes and auditions immediately
        if (wasPlaying && !this.isPlaying) {
          for (const st of this.noteStates.values()) {
            st.isAuditioning = false;
            st.isKeyDown = false;
            st.isReleased = false;
            st.noteAge = 0;
            st.releaseAge = 0;
            st.rhythmTurnsElapsed = 0;
          }
          for (const v of this.voiceStates.values()) {
            v.active = false;
          }
        }

        // Clean up stale noteStates / voiceStates / filterBuffers for removed shapes
        const activeIds = new Set(this.shapes.map((s) => s.shapeId));
        for (const id of this.noteStates.keys()) {
          if (!activeIds.has(id)) {
            this.noteStates.delete(id);
            this.smoothedD.delete(id);
            this.masterPhases.delete(id);
            this.filterBuffers.delete(id);
          }
        }
      } else if (type === 'STOP_ALL') {
        this.isPlaying = false;
        for (const st of this.noteStates.values()) {
          st.isAuditioning = false;
          st.isKeyDown = false;
          st.isReleased = false;
          st.noteAge = 0;
          st.releaseAge = 0;
          st.rhythmTurnsElapsed = 0;
        }
        for (const v of this.voiceStates.values()) {
          v.active = false;
        }
        this.midiVoices.clear();
      } else if (type === 'MIDI_NOTE_ON') {
        const { midiNote, targetD, velocity } = payload || {};
        if (midiNote !== undefined) {
          this.midiVoices.set(midiNote, {
            midiNote,
            targetD: targetD !== undefined ? targetD : 0,
            velocity: velocity !== undefined ? Math.max(0.05, Math.min(1.0, velocity)) : 0.8,
            masterPhase: 0.0,
            noteAge: 0.0,
            isKeyDown: true,
            isReleased: false,
            releaseAge: 0.0,
            currentAmp: 0.0,
          });
        }
      } else if (type === 'MIDI_NOTE_OFF') {
        const { midiNote } = payload || {};
        const v = this.midiVoices.get(midiNote);
        if (v) {
          v.isKeyDown = false;
          v.isReleased = true;
          v.releaseAge = 0.0;
        }
      } else if (type === 'MIDI_RELEASE_ALL') {
        for (const v of this.midiVoices.values()) {
          v.isKeyDown = false;
          v.isReleased = true;
          v.releaseAge = 0.0;
        }
      } else if (type === 'SET_TARGET_D') {
        const { shapeId, targetD } = payload;
        this.smoothedD.set(shapeId, targetD);
      } else if (type === 'NOTE_ON') {
        const { shapeId } = payload || {};
        const targetIds = shapeId ? [shapeId] : (this.shapes.length > 0 ? this.shapes.map((s) => s.shapeId) : Array.from(this.noteStates.keys()));
        for (const id of targetIds) {
          const targetShape = this.shapes.find((s) => s.shapeId === id);
          const targetD = targetShape ? targetShape.placementD : (this.shapes[0]?.placementD ?? 0);
          this.smoothedD.set(id, targetD);
          let st = this.noteStates.get(id);
          if (!st) {
            st = { noteAge: 0, lastD: targetD, isKeyDown: true, isAuditioning: true, isReleased: false, releaseAge: 0, releaseStartAmp: 1.0, attackStartAmp: 0.0, currentAmp: 0.0, rhythmTurnsElapsed: 0, justTriggered: true };
            this.noteStates.set(id, st);
          } else {
            st.attackStartAmp = st.currentAmp || 0.0;
            st.noteAge = 0;
            st.lastD = targetD;
            st.isKeyDown = true;
            st.isAuditioning = true;
            st.isReleased = false;
            st.releaseAge = 0;
            st.releaseStartAmp = 1.0;
            st.rhythmTurnsElapsed = 0;
            st.justTriggered = true;
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
          const targetShape = this.shapes.find((s) => s.shapeId === id);
          const targetD = targetShape ? targetShape.placementD : (this.shapes[0]?.placementD ?? 0);
          this.smoothedD.set(id, targetD);
          let st = this.noteStates.get(id);
          if (!st) {
            st = { noteAge: 0, lastD: targetD, isKeyDown: false, isAuditioning: true, isReleased: false, releaseAge: 0, releaseStartAmp: 1.0, attackStartAmp: 0.0, currentAmp: 0.0, rhythmTurnsElapsed: 0, justTriggered: true };
            this.noteStates.set(id, st);
          } else {
            st.attackStartAmp = st.currentAmp || 0.0;
            st.noteAge = 0;
            st.lastD = targetD;
            st.isKeyDown = false;
            st.isAuditioning = true;
            st.isReleased = false;
            st.releaseAge = 0;
            st.releaseStartAmp = 1.0;
            st.rhythmTurnsElapsed = 0;
            st.justTriggered = true;
          }
          if (!this.isPlaying) {
            this.masterPhases.set(id, 0.0);
          }
        }
      }
    };
  }

  evalOnsetGain(rangeMatchesOrScalar, sceneTurns) {
    const f = this.filter;
    if (!f || !f.enabled) return 1.0;

    const matches = [];

    if (Array.isArray(rangeMatchesOrScalar)) {
      const rangeDefs = f.ranges || [];
      for (let i = 0; i < rangeMatchesOrScalar.length; i++) {
        let match = rangeMatchesOrScalar[i];
        const rDef = rangeDefs[i];
        if (rDef && rDef.superLength > 0 && rDef.superWeights && rDef.superWeights.length > 0) {
          const L = rDef.superLength;
          const c = Math.floor(sceneTurns);
          const superIdx = ((c % L) + L) % L;
          const superWeight = rDef.superWeights[superIdx] !== undefined ? rDef.superWeights[superIdx] : 1.0;
          match *= superWeight;
        }
        matches.push(Math.max(0.0, Math.min(1.0, match)));
      }
    } else if (rangeMatchesOrScalar !== undefined) {
      let match = rangeMatchesOrScalar;
      const rDef = (f.ranges && f.ranges[0]) || null;
      if (rDef && rDef.superLength > 0 && rDef.superWeights && rDef.superWeights.length > 0) {
        const L = rDef.superLength;
        const c = Math.floor(sceneTurns);
        const superIdx = ((c % L) + L) % L;
        const superWeight = rDef.superWeights[superIdx] !== undefined ? rDef.superWeights[superIdx] : 1.0;
        match *= superWeight;
      }
      matches.push(Math.max(0.0, Math.min(1.0, match)));
    }

    if (f.cycles && f.cycles.length > 0) {
      for (let i = 0; i < f.cycles.length; i++) {
        const cCond = f.cycles[i];
        const D = Math.max(1, cCond.divisions || 1);

        let c = Math.floor(sceneTurns);
        const u = sceneTurns - c;
        const rawSlot = Math.round(u * D);
        let slotIndex = rawSlot;
        if (slotIndex >= D) {
          slotIndex = 0;
          c += 1;
        }

        const off = Math.abs(u * D - rawSlot);
        const tol = cCond.tolerance !== undefined ? cCond.tolerance : 0.25;
        const isSlotOnGrid = off <= tol;
        const rot = cCond.rotation || 0;
        const rotatedSlot = ((slotIndex - rot) % D + D) % D;
        const slotWeight = isSlotOnGrid
          ? ((cCond.slotWeights && cCond.slotWeights[rotatedSlot] !== undefined) ? cCond.slotWeights[rotatedSlot] : 0.0)
          : (cCond.offGridMatch !== undefined ? cCond.offGridMatch : 0.0);

        let superMatch = 1.0;
        if (cCond.superLength > 0 && cCond.superWeights && cCond.superWeights.length > 0) {
          const L = cCond.superLength;
          const superIdx = ((c % L) + L) % L;
          superMatch = cCond.superWeights[superIdx] !== undefined ? cCond.superWeights[superIdx] : 1.0;
        }

        matches.push(Math.max(0.0, Math.min(1.0, slotWeight * superMatch)));
      }
    }

    if (matches.length === 0) {
      return 1.0;
    }

    let combined = 1.0;
    if (f.combine === 1) {
      combined = 0;
      for (let i = 0; i < matches.length; i++) {
        if (matches[i] > combined) combined = matches[i];
      }
    } else {
      combined = 1.0;
      for (let i = 0; i < matches.length; i++) {
        if (matches[i] < combined) combined = matches[i];
      }
    }

    if (f.action === 1) {
      return 1.0 - combined * f.depth;
    } else {
      return 1.0 - (1.0 - combined) * f.depth;
    }
  }

  evalRhythmEnvelope(sceneTurns, ratioVal) {
    const envCfg = this.envelope;
    if (!envCfg || !envCfg.enabled || envCfg.rhythmMode !== 1 || !envCfg.adsr) {
      return 1.0;
    }
    const L = Math.max(1, Math.min(16, Math.round(envCfg.supercycleLength || 4)));
    const u = (((sceneTurns % L) + L) % L) / L;
    const adsr = envCfg.adsr;
    const rawA = Math.max(0.005, adsr.attack);
    const rawD = Math.max(0.01, adsr.decay);
    const rawR = Math.max(0.01, adsr.release);
    const sus = Math.max(0.0, Math.min(1.0, adsr.sustain));
    const damp = adsr.damping !== undefined ? Math.max(0.0, adsr.damping) : 0.0;

    const total = rawA + rawD + rawR;
    const scale = total > 0.9 ? 0.9 / total : 1.0;
    const attFrac = rawA * scale;
    const decFrac = rawD * scale;
    const relFrac = rawR * scale;
    const susEnd = 1.0 - relFrac;

    let env = 1.0;
    if (u < attFrac) {
      const aRatio = u / Math.max(0.0001, attFrac);
      env = aRatio * aRatio * (3.0 - 2.0 * aRatio);
    } else if (u < attFrac + decFrac) {
      const dProgress = (u - attFrac) / Math.max(0.0001, decFrac);
      const dampMult = 1.0 + damp * Math.max(0.0, (ratioVal || 1.0) - 1.0);
      env = sus + (1.0 - sus) * Math.exp(-3.0 * dProgress * dampMult);
    } else if (u < susEnd) {
      env = sus;
    } else {
      const rProgress = (u - susEnd) / Math.max(0.0001, relFrac);
      env = sus * Math.max(0.0, 1.0 - rProgress);
    }
    return Math.max(0.0, Math.min(1.0, env));
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
        nState = { noteAge: 0, lastD: targetD, isKeyDown: false, isAuditioning: false, isReleased: false, releaseAge: 0, releaseStartAmp: 1.0, attackStartAmp: 0.0, currentAmp: 0.0, rhythmTurnsElapsed: 0, justTriggered: true };
        this.noteStates.set(shapeId, nState);
      } else if (Math.abs(targetD - nState.lastD) > 0.05) {
        // Re-trigger envelope on intentional musical pitch step only if continuous transport playback is actively running
        if (this.isPlaying && shape.adsr && shape.adsr.sustain <= 0.25) {
          nState.attackStartAmp = nState.currentAmp || 0.0;
          nState.noteAge = 0;
        }
        nState.lastD = targetD;
      }

      // Audible if continuous transport is running OR if shape is being auditioned via key T
      const isAudible = this.isPlaying || nState.isAuditioning;
      if (!isAudible) {
        phaseTelemetry[shapeId] = {
          masterPhase: this.masterPhases.get(shapeId) || 0.0,
          f0: this.tplHz * Math.pow(2, -currentD),
          smoothedD: currentD,
          noteAge: 0,
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
      // Percussive / plucked decaying shapes (piano, pluck, bell, vibraphone with sustain <= 0.25)
      // ring out their decay, pause briefly, and auto-restrike during continuous playback.
      // Sustained shapes (sine, triangle, square, saw, reed, triads, 7th chords) sustain smoothly without re-triggering.
      const isPitchSpace = f0 > 25.8;
      const isDecayingShape = adsr && adsr.sustain <= 0.25;
      const autoStrikePeriod = isDecayingShape
        ? Math.max(1.2, adsr.attack + adsr.decay * 1.35 + 0.4)
        : 1e9;

      // Perceptual headroom normalisation: preserves full volume for simple 1-2 partial shapes
      // while smoothly scaling multi-partial chords and rich timbres to prevent digital clipping
      let totalAmpSum = 0;
      for (let pIdx = 0; pIdx < shape.partials.length; pIdx++) {
        totalAmpSum += shape.partials[pIdx].amp;
      }
      const shapeHeadroom = totalAmpSum > 1.2 ? 1.2 / Math.sqrt(totalAmpSum * 1.2) : 1.0;

      for (let s = 0; s < numSamples; s++) {
        const sampleDt = 1.0 / sampleRate;
        const masterPhaseIncrement = f0 * sampleDt;
        const prevPhase = masterPhase;
        // Keep masterPhase unwrapped so non-integer harmonic ratios (5/4, 3/2, 7/4, stretched piano)
        // never suffer a phase jump when the fundamental crosses integer cycle boundaries
        masterPhase = masterPhase + masterPhaseIncrement;
        if (masterPhase > 9369360) {
          masterPhase -= 9369360;
        }
        const cyclePhase = masterPhase % 1.0;
        const prevCyclePhase = prevPhase % 1.0;

        nState.noteAge += sampleDt;

        if (nState.isReleased) {
          nState.releaseAge += sampleDt;
        }

        // In continuous transport playback, percussive decaying instruments auto-restrike smoothly:
        if (this.isPlaying && isPitchSpace && isDecayingShape && nState.noteAge >= autoStrikePeriod) {
          nState.attackStartAmp = nState.currentAmp || 0.0;
          nState.noteAge = 0;
          nState.isReleased = false;
          nState.releaseAge = 0;
        }

        // In rhythm space audition: count elapsed turns.
        // If key is released, let the rhythm finish the current full cycle (>= 1.0 turns) before stopping cleanly at the Apex.
        if (!isPitchSpace && nState.isAuditioning) {
          nState.rhythmTurnsElapsed += masterPhaseIncrement;
          if (!nState.isKeyDown && nState.rhythmTurnsElapsed >= 1.0 && (cyclePhase < 0.06 || prevCyclePhase > 0.94)) {
            nState.isAuditioning = false;
            masterPhase = 0.0;
          }
        }
        const noteAge = nState.noteAge;
        const isFirstSampleTrigger = !!nState.justTriggered;
        nState.justTriggered = false;

        let sampleValL = 0;
        let sampleValR = 0;
        const fBuf = this.filterBuffers.get(shapeId);

        for (let pIdx = 0; pIdx < shape.partials.length; pIdx++) {
          const p = shape.partials[pIdx];
          if (p.amp <= 0.0001) continue;

          const ratioVal = p.ratio;
          const partialFreq = f0 * ratioVal;
          const partialPhase = ((masterPhase * ratioVal + p.phaseOffset) % 1.0 + 1.0) % 1.0;

          // Time-varying Filter Gate Evaluation:
          let curGateTarget = 1.0;
          let curGateSmooth = 1.0;

          if (fBuf && this.filter && this.filter.enabled) {
            if (this.filter.hasCycle || this.filter.hasRangeSuper) {
              const n = Math.floor((masterPhase - p.phaseOffset) * ratioVal);
              if (n !== fBuf.lastOnsetIdx[pIdx]) {
                fBuf.lastOnsetIdx[pIdx] = n;
                const onsetMaster = n / ratioVal + p.phaseOffset;
                const sceneTurns = shape.isPrimary ? onsetMaster : onsetMaster * (shape.ratioToScene || 1.0);
                fBuf.gateTarget[pIdx] = this.evalOnsetGain(p.rangeMatches, sceneTurns);
              }
              const a = 1.0 - Math.exp(-sampleDt / Math.max(0.0005, 0.25 / partialFreq));
              fBuf.gateSmooth[pIdx] += (fBuf.gateTarget[pIdx] - fBuf.gateSmooth[pIdx]) * a;
            } else {
              fBuf.gateTarget[pIdx] = this.evalOnsetGain(p.rangeMatches, 0);
              fBuf.gateSmooth[pIdx] = fBuf.gateTarget[pIdx];
            }
            curGateTarget = fBuf.gateTarget[pIdx];
            curGateSmooth = fBuf.gateSmooth[pIdx];
          }

          // Event phase aligned with visual CycleWheel & EventLanes:
          // Dots are placed at (dot / ratioVal + p.phaseOffset) % 1.0, so playhead crosses a dot
          // whenever ((masterPhase - p.phaseOffset) * ratioVal) % 1.0 wraps from 1.0 -> 0.0.
          const eventPhase = (((masterPhase - p.phaseOffset) * ratioVal) % 1.0 + 1.0) % 1.0;
          const prevEventPhase = (((prevPhase - p.phaseOffset) * ratioVal) % 1.0 + 1.0) % 1.0;

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
            const att = Math.max(0.004, adsr.attack);
            const dec = Math.max(0.01, adsr.decay);
            const sus = Math.max(0.0, Math.min(1.0, adsr.sustain));
            const damp = adsr.damping !== undefined ? Math.max(0.0, adsr.damping) : 0.0;
            const rel = Math.max(0.04, adsr.release);
            const startAmp = nState.attackStartAmp || 0.0;

            if (noteAge < att) {
              const aRatio = noteAge / att;
              const hermite = aRatio * aRatio * (3.0 - 2.0 * aRatio); // smooth Hermite attack ramp
              env = startAmp + (1.0 - startAmp) * hermite;
            } else {
              const decayElapsed = noteAge - att;
              // Higher partials decay faster via harmonic damping
              const tau = dec / (1.0 + damp * Math.max(0.0, ratioVal - 1.0));
              const expDecay = Math.exp(-decayElapsed / Math.max(0.005, tau));
              env = sus + (1.0 - sus) * expDecay;
            }

            // Key release behaviour:
            // When key is released, apply release ramp down to zero
            if (nState.isReleased) {
              const relProgress = Math.min(1.0, nState.releaseAge / rel);
              env *= (1.0 - relProgress);
            } else {
              nState.releaseStartAmp = env;
            }
            if (pIdx === 0) {
              nState.currentAmp = env;
            }

            // In pitch space audition when transport is paused, end audition when note is silent
            if (isPitchSpace && nState.isAuditioning && !this.isPlaying && (nState.isReleased || sus <= 0.05)) {
              if (env <= 0.0008) {
                nState.isAuditioning = false;
                nState.currentAmp = 0.0;
              }
            }
          } else if (!adsr && !this.isPlaying && nState.isAuditioning && nState.isReleased) {
            const relProgress = Math.min(1.0, nState.releaseAge / 0.15);
            env = Math.max(0, 1.0 - relProgress);
            if (pIdx === 0) nState.currentAmp = env;
            if (env <= 0.0008) {
              nState.isAuditioning = false;
              nState.currentAmp = 0.0;
            }
          }

          // 1. Tone Component (Pure sinusoid shaped by dynamic ADSR envelope & smoothed gate)
          let toneSample = 0;
          if (toneWeight > 0.001) {
            toneSample = Math.sin(2.0 * Math.PI * partialPhase) * p.amp * env * toneWeight * curGateSmooth;
          }

          // 2. Event / Pulse Component
          let eventSample = 0;
          if (eventWeight > 0.001) {
            const sceneTurnsForEnv = shape.isPrimary ? masterPhase : masterPhase * (shape.ratioToScene || 1.0);
            const rhythmEnv = this.evalRhythmEnvelope(sceneTurnsForEnv, ratioVal);
            if (this.audioMode === 'literal') {
              const pulseW = 0.08;
              if (eventPhase < pulseW) {
                eventSample = 0.5 * (1.0 - Math.cos(2.0 * Math.PI * (eventPhase / pulseW))) * p.amp * eventWeight * curGateTarget * rhythmEnv;
              }
            } else {
              // Poetic Mode: voice-specific pitched percussion synthesis on eventPhase wrap
              const wrapped = (eventPhase < prevEventPhase && (prevEventPhase - eventPhase) > 0.5) ||
                (isFirstSampleTrigger && eventPhase < 0.04);
              const voiceKey = shapeId + '_' + pIdx;
              const voiceId = p.voice || 'woodblock';
              let vState = this.voiceStates.get(voiceKey);
              if (!vState || vState.voiceId !== voiceId) {
                let decaySec = 0.065;
                let pitchHz = 220;
                if (voiceId === 'kick') { decaySec = 0.095; pitchHz = 62; }
                else if (voiceId === 'snare') { decaySec = 0.075; pitchHz = 210; }
                else if (voiceId === 'clave') { decaySec = 0.045; pitchHz = 1480; }
                else if (voiceId === 'woodblock') { decaySec = 0.055; pitchHz = 780; }
                else if (voiceId === 'hihat') { decaySec = 0.038; pitchHz = 3800; }
                else if (voiceId === 'triangle') { decaySec = 0.11; pitchHz = 2400; }
                else { decaySec = 0.035; pitchHz = 1100; }
                vState = { active: false, sampleIndex: 0, decaySamples: Math.floor(sampleRate * decaySec), pitchHz, voiceId, gate: 1.0 };
                this.voiceStates.set(voiceKey, vState);
              }

              if (wrapped) {
                if (curGateTarget > 0.001) {
                  vState.active = true;
                  vState.sampleIndex = 0;
                  vState.gate = curGateTarget;
                }
              }

              if (vState.active) {
                const tSec = vState.sampleIndex / sampleRate;
                const vEnv = Math.pow(Math.max(0, 1.0 - vState.sampleIndex / vState.decaySamples), 1.6);
                let clickOsc = 0;
                if (voiceId === 'kick') {
                  // Punchy pitch-drop bass drum
                  const instPhase = 2.0 * Math.PI * (55 * tSec + 4.5 * (1.0 - Math.exp(-tSec * 45)));
                  clickOsc = Math.sin(instPhase) * 1.25;
                } else if (voiceId === 'snare') {
                  // Snare body + metallic rattle
                  const body = Math.sin(2.0 * Math.PI * 195 * tSec);
                  const rattle = Math.sin(2.0 * Math.PI * 1187 * tSec + Math.sin(2.0 * Math.PI * 3511 * tSec) * 2.5);
                  clickOsc = body * 0.65 + rattle * 0.55;
                } else if (voiceId === 'hihat') {
                  // Crisp FM metallic hi-hat
                  clickOsc = Math.sin(2.0 * Math.PI * 3840 * tSec + Math.sin(2.0 * Math.PI * 5410 * tSec) * 3.8) * 0.75;
                } else {
                  clickOsc = Math.sin(2.0 * Math.PI * vState.pitchHz * tSec);
                }
                const gateMult = vState.gate !== undefined ? vState.gate : 1.0;
                eventSample = clickOsc * vEnv * p.amp * eventWeight * 1.45 * gateMult * rhythmEnv;
                vState.sampleIndex++;
                if (vState.sampleIndex >= vState.decaySamples) {
                  vState.active = false;
                }
              }
            }
          }

          const combined = (toneSample + eventSample) * shape.gain * shapeHeadroom;
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

    // Polyphonic MIDI Voices (rendered using primary shape partials, ADSR & filter)
    if (this.midiVoices.size > 0 && this.shapes.length > 0) {
      const primaryShape = this.shapes[0];
      if (!primaryShape.mute && primaryShape.gain > 0.0001) {
        const adsr = primaryShape.adsr;
        let totalAmpSum = 0;
        for (let pIdx = 0; pIdx < primaryShape.partials.length; pIdx++) {
          totalAmpSum += primaryShape.partials[pIdx].amp;
        }
        const shapeHeadroom = totalAmpSum > 1.2 ? 1.2 / Math.sqrt(totalAmpSum * 1.2) : 1.0;
        const sampleDt = 1.0 / sampleRate;

        for (const [midiNote, mv] of this.midiVoices.entries()) {
          const f0 = this.tplHz * Math.pow(2, -mv.targetD);
          let mvPhase = mv.masterPhase;
          let finished = false;

          for (let s = 0; s < numSamples; s++) {
            mvPhase += f0 * sampleDt;
            if (mvPhase > 9369360) mvPhase -= 9369360;
            mv.noteAge += sampleDt;
            if (mv.isReleased) mv.releaseAge += sampleDt;

            let sampleValL = 0;
            let sampleValR = 0;

            for (let pIdx = 0; pIdx < primaryShape.partials.length; pIdx++) {
              const p = primaryShape.partials[pIdx];
              if (p.amp <= 0.0001) continue;

              const ratioVal = p.ratio;
              const partialPhase = ((mvPhase * ratioVal + p.phaseOffset) % 1.0 + 1.0) % 1.0;

              let env = 1.0;
              if (adsr) {
                const att = Math.max(0.004, adsr.attack);
                const dec = Math.max(0.01, adsr.decay);
                const sus = Math.max(0.0, Math.min(1.0, adsr.sustain));
                const damp = adsr.damping !== undefined ? Math.max(0.0, adsr.damping) : 0.0;
                const rel = Math.max(0.04, adsr.release);
                if (mv.noteAge < att) {
                  const aRatio = mv.noteAge / att;
                  env = aRatio * aRatio * (3.0 - 2.0 * aRatio);
                } else {
                  const decayElapsed = mv.noteAge - att;
                  const tau = dec / (1.0 + damp * Math.max(0.0, ratioVal - 1.0));
                  env = sus + (1.0 - sus) * Math.exp(-decayElapsed / Math.max(0.005, tau));
                }
                if (mv.isReleased) {
                  const relProgress = Math.min(1.0, mv.releaseAge / rel);
                  env *= (1.0 - relProgress);
                }
              } else if (mv.isReleased) {
                const relProgress = Math.min(1.0, mv.releaseAge / 0.15);
                env = Math.max(0.0, 1.0 - relProgress);
              }

              if (pIdx === 0) {
                mv.currentAmp = env;
                if (mv.isReleased && env <= 0.0008) {
                  finished = true;
                }
              }

              const gateGain = (this.filter && this.filter.enabled)
                ? this.evalOnsetGain(p.rangeMatches, mvPhase)
                : 1.0;

              const sig = Math.sin(2.0 * Math.PI * partialPhase) * p.amp * env * gateGain * mv.velocity * primaryShape.gain * shapeHeadroom;
              const pan = Math.sin(pIdx * 1.2) * 0.35;
              sampleValL += sig * (0.5 - pan * 0.5);
              sampleValR += sig * (0.5 + pan * 0.5);
            }

            channelLeft[s] += sampleValL * this.masterGain;
            channelRight[s] += sampleValR * this.masterGain;
            if (finished) break;
          }

          mv.masterPhase = mvPhase;
          if (finished) {
            this.midiVoices.delete(midiNote);
          }
        }
      }
    }

    // Transparent soft-knee saturation prevents harsh digital DAC hard-clipping
    // and eliminates clicking from multi-partial constructive interference
    for (let s = 0; s < numSamples; s++) {
      channelLeft[s] = Math.tanh(channelLeft[s]);
      channelRight[s] = Math.tanh(channelRight[s]);
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
