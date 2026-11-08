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

    this.port.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'UPDATE_SCENE') {
        this.shapes = payload.shapes || [];
        this.audioMode = payload.audioMode || 'poetic';
        this.masterGain = payload.masterGain !== undefined ? payload.masterGain : 0.75;
        this.tplHz = payload.tplHz || 25.8;
      } else if (type === 'SET_TARGET_D') {
        const { shapeId, targetD } = payload;
        this.smoothedD.set(shapeId, targetD);
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

    for (const shape of this.shapes) {
      if (shape.mute || shape.gain <= 0.0001) continue;

      const shapeId = shape.shapeId;
      let currentD = this.smoothedD.get(shapeId) ?? shape.placementD;
      const targetD = shape.placementD;

      // Exponential smoothing toward targetD
      currentD += (targetD - currentD) * 0.08;
      this.smoothedD.set(shapeId, currentD);

      const f0 = this.tplHz * Math.pow(2, -currentD);
      let masterPhase = this.masterPhases.get(shapeId) || 0.0;

      for (let s = 0; s < numSamples; s++) {
        const sampleDt = 1.0 / sampleRate;
        const masterPhaseIncrement = f0 * sampleDt;
        const prevPhase = masterPhase;
        masterPhase = (masterPhase + masterPhaseIncrement) % 1.0;

        let sampleValL = 0;
        let sampleValR = 0;

        for (let pIdx = 0; pIdx < shape.partials.length; pIdx++) {
          const p = shape.partials[pIdx];
          if (p.amp <= 0.0001) continue;

          const ratioVal = p.ratio;
          const partialFreq = f0 * ratioVal;
          const partialPhase = (masterPhase * ratioVal + p.phaseOffset) % 1.0;

          // Perceptual regime weights across 10 - 40 Hz
          // toneWeight = 0 below 10Hz, smoothly ramps to 1 at 40Hz
          let toneWeight = 0.0;
          if (partialFreq >= 40.0) {
            toneWeight = 1.0;
          } else if (partialFreq > 10.0) {
            toneWeight = 0.5 * (1.0 - Math.cos(Math.PI * (partialFreq - 10.0) / 30.0));
          }
          const eventWeight = 1.0 - toneWeight;

          // 1. Tone Component (Pure sinusoid)
          let toneSample = 0;
          if (toneWeight > 0.001) {
            toneSample = Math.sin(2.0 * Math.PI * partialPhase) * p.amp * toneWeight;
          }

          // 2. Event / Pulse Component
          let eventSample = 0;
          if (eventWeight > 0.001) {
            if (this.audioMode === 'literal') {
              // Narrow raised-cosine grain / windowed impulse
              const pulseW = 0.08;
              if (partialPhase < pulseW) {
                eventSample = 0.5 * (1.0 - Math.cos(2.0 * Math.PI * (partialPhase / pulseW))) * p.amp * eventWeight;
              }
            } else {
              // Poetic Mode: pitched click / transient on cycle wrap
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
          // Simple stereo spread across partial index
          const pan = Math.sin(pIdx * 1.2) * 0.35;
          sampleValL += combined * (0.5 - pan * 0.5);
          sampleValR += combined * (0.5 + pan * 0.5);
        }

        channelLeft[s] += sampleValL * this.masterGain;
        channelRight[s] += sampleValR * this.masterGain;
      }

      this.masterPhases.set(shapeId, masterPhase);
    }

    return true;
  }
}

registerProcessor('spectrum-synth-processor', SpectrumSynthProcessor);
`;
