import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ADSR,
  forkShapeForEdit,
  withAnchors,
  toggleAnchorMute,
  createAnchor,
  removeAnchor,
  updateAnchorPartial,
  toggleAnchorPartialMute,
  addAnchorPartial,
  removeAnchorPartial,
  overtonePresetPartials,
  applyInharmonicity,
  applyDamping,
  createBlankShape,
} from '../shape-editing';
import { Shape, VoiceAnchor } from '../types';

describe('shape-editing', () => {
  const sampleShape: Shape = {
    id: 'preset-saw',
    name: 'Saw Wave',
    origin: 'preset',
    adsr: { ...DEFAULT_ADSR },
    anchors: [
      {
        id: 'a1',
        name: 'Root Anchor (Do 1/1)',
        ratio: { kind: 'rational', num: 1, den: 1 },
        phaseOffset: 0,
        gain: 0.9,
        mute: false,
        partials: [
          {
            id: 'p1',
            ratio: { kind: 'rational', num: 1, den: 1 },
            amp: 1.0,
            previousAmp: 1.0,
            phase: 0,
            voice: 'woodblock',
            label: '1x Fund',
          },
          {
            id: 'p2',
            ratio: { kind: 'rational', num: 2, den: 1 },
            amp: 0.5,
            previousAmp: 0.5,
            phase: 0,
            voice: 'woodblock',
            label: '2x Oct',
          },
        ],
      },
    ],
    partials: [],
  };

  it('exposes DEFAULT_ADSR envelope constants', () => {
    expect(DEFAULT_ADSR.attack).toBe(0.01);
    expect(DEFAULT_ADSR.decay).toBe(1.0);
    expect(DEFAULT_ADSR.sustain).toBe(0.8);
    expect(DEFAULT_ADSR.release).toBe(0.3);
    expect(DEFAULT_ADSR.damping).toBe(0.2);
  });

  describe('forkShapeForEdit', () => {
    it('forks preset shape into user shape with (Custom) suffix and fresh ID', () => {
      const forked = forkShapeForEdit(sampleShape, (p) => `${p}-999`);
      expect(forked.id).toBe('user-shape-999');
      expect(forked.name).toBe('Saw Wave (Custom)');
      expect(forked.origin).toBe('user');
      expect(forked.anchors).toHaveLength(1);
      expect(forked.partials.length).toBeGreaterThan(0);
      expect(forked.adsr).toEqual(sampleShape.adsr);
    });

    it('leaves already-user shape with existing identity and origin', () => {
      const userShape: Shape = { ...sampleShape, id: 'user-custom', origin: 'user', name: 'My Sound' };
      const forked = forkShapeForEdit(userShape);
      expect(forked.id).toBe('user-custom');
      expect(forked.name).toBe('My Sound');
      expect(forked.origin).toBe('user');
    });
  });

  describe('withAnchors', () => {
    it('updates anchors and rebuilds flattened partials', () => {
      const newAnchors: VoiceAnchor[] = [
        {
          id: 'a2',
          name: 'Anchor 2',
          ratio: { kind: 'rational', num: 3, den: 2 },
          phaseOffset: 0,
          gain: 1,
          mute: false,
          partials: [
            { id: 'p3', ratio: { kind: 'rational', num: 1, den: 1 }, amp: 0.8, phase: 0 },
          ],
        },
      ];
      const updated = withAnchors(sampleShape, newAnchors);
      expect(updated.anchors).toEqual(newAnchors);
      expect(updated.partials).toHaveLength(1);
    });
  });

  describe('toggleAnchorMute', () => {
    it('mutes unmuted anchor and stores previousGain', () => {
      const anchors = sampleShape.anchors!;
      const muted = toggleAnchorMute(anchors, 0);
      expect(muted[0]?.mute).toBe(true);
      expect(muted[0]?.gain).toBe(0);
      expect(muted[0]?.previousGain).toBe(0.9);

      // Restore
      const unmuted = toggleAnchorMute(muted, 0);
      expect(unmuted[0]?.mute).toBe(false);
      expect(unmuted[0]?.gain).toBe(0.9);
    });

    it('falls back to 0.85 gain when unmuting if previousGain is missing or zero', () => {
      const anchors: VoiceAnchor[] = [
        {
          ...sampleShape.anchors![0]!,
          mute: true,
          gain: 0,
          previousGain: undefined,
        },
      ];
      const unmuted = toggleAnchorMute(anchors, 0);
      expect(unmuted[0]?.mute).toBe(false);
      expect(unmuted[0]?.gain).toBe(0.85);
    });
  });

  describe('createAnchor and removeAnchor', () => {
    it('creates interval and rhythm anchors with distinct defaults', () => {
      const intervalAnchor = createAnchor('interval', 2, (p) => `${p}-int`);
      expect(intervalAnchor.name).toBe('Voice Anchor 2 (So 3/2)');
      expect(intervalAnchor.voice).toBe('woodblock');
      expect(intervalAnchor.partials).toHaveLength(1);

      const rhythmAnchor = createAnchor('rhythm', 3, (p) => `${p}-rhy`);
      expect(rhythmAnchor.name).toBe('Rhythm Anchor 3 (Fi Offbeat)');
      expect(rhythmAnchor.phaseOffset).toBe(0.5);
      expect(rhythmAnchor.offsetToken).toBe('Fi');
      expect(rhythmAnchor.voice).toBe('clave');
      expect(rhythmAnchor.partials).toHaveLength(1);
    });

    it('guards against removing the last remaining anchor', () => {
      const single = sampleShape.anchors!;
      expect(removeAnchor(single, 0)).toEqual(single);

      const multiple = [...single, createAnchor('interval', 2)];
      const afterRemove = removeAnchor(multiple, 0);
      expect(afterRemove).toHaveLength(1);
      expect(afterRemove[0]?.name).toContain('Voice Anchor 2');
    });
  });

  describe('partial operations', () => {
    it('patches partial properties with updateAnchorPartial', () => {
      const anchors = sampleShape.anchors!;
      const updated = updateAnchorPartial(anchors, 0, 1, { amp: 0.25, voice: 'triangle' });
      expect(updated[0]?.partials[1]?.amp).toBe(0.25);
      expect(updated[0]?.partials[1]?.voice).toBe('triangle');
    });

    it('toggles partial mute and restores previous amplitude', () => {
      const anchors = sampleShape.anchors!;
      const muted = toggleAnchorPartialMute(anchors, 0, 0);
      expect(muted[0]?.partials[0]?.amp).toBe(0);
      expect(muted[0]?.partials[0]?.previousAmp).toBe(1.0);

      const unmuted = toggleAnchorPartialMute(muted, 0, 0);
      expect(unmuted[0]?.partials[0]?.amp).toBe(1.0);
    });

    it('adds harmonic partial with 1/n amplitude', () => {
      const anchors = sampleShape.anchors!;
      const added = addAnchorPartial(anchors, 0, (p) => `${p}-har`);
      expect(added[0]?.partials).toHaveLength(3);
      const p3 = added[0]?.partials[2];
      expect(p3).toBeDefined();
      expect(p3?.ratio).toEqual({ kind: 'rational', num: 3, den: 1 });
      expect(p3?.amp).toBe(0.33); // round(1/3 * 100) / 100
      expect(p3?.label).toBe('3x');
    });

    it('guards against removing the last partial from an anchor', () => {
      const singlePartialAnchor: VoiceAnchor[] = [
        { ...sampleShape.anchors![0]!, partials: [sampleShape.anchors![0]!.partials[0]!] },
      ];
      expect(removeAnchorPartial(singlePartialAnchor, 0, 0)).toEqual(singlePartialAnchor);

      const multiple = sampleShape.anchors!;
      const afterRemove = removeAnchorPartial(multiple, 0, 0);
      expect(afterRemove[0]?.partials).toHaveLength(1);
      expect(afterRemove[0]?.partials[0]?.label).toBe('2x Oct');
    });
  });

  describe('overtonePresetPartials', () => {
    it('builds pure mode single fundamental partial', () => {
      const pts = overtonePresetPartials('pure', 'triangle');
      expect(pts).toHaveLength(1);
      expect(pts[0]?.label).toBe('1x Fund');
      expect(pts[0]?.voice).toBe('triangle');
    });

    it('builds to-p5 mode with 3 partials', () => {
      const pts = overtonePresetPartials('to-p5', 'woodblock');
      expect(pts).toHaveLength(3);
      expect(pts[0]?.label).toBe('1x Fund');
      expect(pts[1]?.label).toBe('2x Oct');
      expect(pts[2]?.label).toBe('3x P5');
    });

    it('builds saw4 mode with 4 harmonic partials', () => {
      const pts = overtonePresetPartials('saw4', 'woodblock');
      expect(pts).toHaveLength(4);
      expect(pts[3]?.ratio).toEqual({ kind: 'rational', num: 4, den: 1 });
      expect(pts[3]?.amp).toBe(0.25);
    });
  });

  describe('macros', () => {
    it('applies inharmonicity stretch B coefficient', () => {
      const anchors = sampleShape.anchors!;
      // b = 0 preserves rational
      const zeroB = applyInharmonicity(anchors, 0);
      expect(zeroB[0]?.partials[1]?.ratio).toEqual({ kind: 'rational', num: 2, den: 1 });

      // b > 0 applies stretch factor
      const stretched = applyInharmonicity(anchors, 0.001);
      const r2 = stretched[0]?.partials[1]?.ratio;
      expect(r2?.kind).toBe('real');
      if (r2?.kind === 'real') {
        expect(r2.value).toBeGreaterThan(2.0);
      }
    });

    it('applies exponential spectral damping with floor of 0.01', () => {
      const anchors = sampleShape.anchors!;
      const damped = applyDamping(anchors, 0.5);
      expect(damped[0]?.partials[0]?.amp).toBe(1.0); // e^0 = 1
      expect(damped[0]?.partials[1]?.amp).toBe(0.61); // e^(-0.5) ~ 0.6065 -> 0.61

      const heavyDamped = applyDamping(anchors, 10);
      expect(heavyDamped[0]?.partials[1]?.amp).toBe(0.01); // clamped min
    });
  });

  describe('createBlankShape', () => {
    it('creates fresh user shape with single root anchor and flattened partials', () => {
      const blank = createBlankShape((p) => `${p}-new`);
      expect(blank.id).toBe('user-shape-new');
      expect(blank.name).toBe('Custom Shape');
      expect(blank.origin).toBe('user');
      expect(blank.anchors).toHaveLength(1);
      expect(blank.partials).toHaveLength(1);
      expect(blank.anchors?.[0]?.name).toContain('Root Anchor (Do 1/1)');
    });
  });
});
