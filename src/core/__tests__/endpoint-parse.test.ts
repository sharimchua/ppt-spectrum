import { describe, it, expect } from 'vitest';
import { parseEndpoint, formatEndpoint, convertEndpointForReference } from '../endpoint-parse';

describe('endpoint-parse', () => {
  describe('parseEndpoint', () => {
    it('parses rational ratios', () => {
      expect(parseEndpoint('5/4')).toEqual({
        unit: 'ratio',
        ratio: { kind: 'rational', num: 5, den: 4 },
      });
      expect(parseEndpoint(' 3 / 2 ')).toEqual({
        unit: 'ratio',
        ratio: { kind: 'rational', num: 3, den: 2 },
      });
      // Reduces rational fractions
      expect(parseEndpoint('10/8')).toEqual({
        unit: 'ratio',
        ratio: { kind: 'rational', num: 5, den: 4 },
      });
    });

    it('parses real number ratios', () => {
      expect(parseEndpoint('1.25')).toEqual({
        unit: 'ratio',
        ratio: { kind: 'real', value: 1.25 },
      });
      expect(parseEndpoint('2.0')).toEqual({
        unit: 'ratio',
        ratio: { kind: 'real', value: 2.0 },
      });
    });

    it('parses cents with various units and symbols', () => {
      expect(parseEndpoint('386.31c')).toEqual({
        unit: 'cents',
        value: 386.31,
      });
      expect(parseEndpoint('400 cents')).toEqual({
        unit: 'cents',
        value: 400,
      });
      expect(parseEndpoint('-12.5 ¢')).toEqual({
        unit: 'cents',
        value: -12.5,
      });
    });

    it('parses EDO step notations with optional period', () => {
      expect(parseEndpoint('4\\12')).toEqual({
        unit: 'edo',
        steps: 4,
        divisions: 12,
      });
      expect(parseEndpoint('7 \\ 12')).toEqual({
        unit: 'edo',
        steps: 7,
        divisions: 12,
      });
      expect(parseEndpoint('4\\19 @ 3/1')).toEqual({
        unit: 'edo',
        steps: 4,
        divisions: 19,
        period: { kind: 'rational', num: 3, den: 1 },
      });
    });

    it('parses frequencies in Hz', () => {
      expect(parseEndpoint('440hz')).toEqual({
        unit: 'hz',
        value: 440,
      });
      expect(parseEndpoint('25.8 Hz')).toEqual({
        unit: 'hz',
        value: 25.8,
      });
    });

    it('parses tempo in BPM', () => {
      expect(parseEndpoint('120bpm')).toEqual({
        unit: 'bpm',
        value: 120,
      });
      expect(parseEndpoint('60.5 BPM')).toEqual({
        unit: 'bpm',
        value: 60.5,
      });
    });

    it('parses DuPeriod d coordinates', () => {
      expect(parseEndpoint('d:1.5')).toEqual({
        unit: 'd',
        value: 1.5,
      });
      expect(parseEndpoint('d = -2.0')).toEqual({
        unit: 'd',
        value: -2.0,
      });
      expect(parseEndpoint('2.5d')).toEqual({
        unit: 'd',
        value: 2.5,
      });
    });

    it('returns null for empty or invalid strings', () => {
      expect(parseEndpoint('')).toBeNull();
      expect(parseEndpoint('   ')).toBeNull();
      expect(parseEndpoint('invalid')).toBeNull();
      expect(parseEndpoint('0/0')).toBeNull();
      expect(parseEndpoint('-440hz')).toBeNull();
    });
  });

  describe('formatEndpoint', () => {
    it('formats rational and real ratios', () => {
      expect(formatEndpoint({ unit: 'ratio', ratio: { kind: 'rational', num: 5, den: 4 } })).toBe('5/4');
      expect(formatEndpoint({ unit: 'ratio', ratio: { kind: 'real', value: 1.25 } })).toBe('1.2500');
    });

    it('formats cents with signs', () => {
      expect(formatEndpoint({ unit: 'cents', value: 386.31 })).toBe('+386.3¢');
      expect(formatEndpoint({ unit: 'cents', value: -14.0 })).toBe('-14.0¢');
    });

    it('formats EDO steps', () => {
      expect(formatEndpoint({ unit: 'edo', steps: 4, divisions: 12 })).toBe('4\\12');
      expect(
        formatEndpoint({
          unit: 'edo',
          steps: 4,
          divisions: 19,
          period: { kind: 'rational', num: 3, den: 1 },
        })
      ).toBe('4\\19@3/1');
    });

    it('formats Hz, BPM, and d coordinates', () => {
      expect(formatEndpoint({ unit: 'hz', value: 440 })).toBe('440.0 Hz');
      expect(formatEndpoint({ unit: 'bpm', value: 120 })).toBe('120.0 BPM');
      expect(formatEndpoint({ unit: 'd', value: 1.5 })).toBe('d: +1.50');
      expect(formatEndpoint({ unit: 'd', value: -2.0 })).toBe('d: -2.00');
    });
  });

  describe('convertEndpointForReference', () => {
    it('returns null when input is null', () => {
      expect(convertEndpointForReference(null, 'scene')).toBeNull();
      expect(convertEndpointForReference(null, 'absolute')).toBeNull();
      expect(convertEndpointForReference(null, 'anchor')).toBeNull();
    });

    it('converts relative units to absolute d coordinates', () => {
      // 0 cents -> d = 0
      expect(convertEndpointForReference({ unit: 'cents', value: 0 }, 'absolute')).toEqual({
        unit: 'd',
        value: -0,
      });
      // 1200 cents (1 octave up) -> d = -1
      expect(convertEndpointForReference({ unit: 'cents', value: 1200 }, 'absolute')).toEqual({
        unit: 'd',
        value: -1,
      });
      // 2/1 ratio -> d = -1
      expect(
        convertEndpointForReference(
          { unit: 'ratio', ratio: { kind: 'rational', num: 2, den: 1 } },
          'absolute'
        )
      ).toEqual({
        unit: 'd',
        value: -1,
      });
      // Preserves existing absolute units
      expect(convertEndpointForReference({ unit: 'd', value: 1.5 }, 'absolute')).toEqual({
        unit: 'd',
        value: 1.5,
      });
      expect(convertEndpointForReference({ unit: 'hz', value: 440 }, 'absolute')).toEqual({
        unit: 'hz',
        value: 440,
      });
    });

    it('converts absolute units to relative cents', () => {
      // d = 0 -> 0 cents
      expect(convertEndpointForReference({ unit: 'd', value: 0 }, 'scene')).toEqual({
        unit: 'cents',
        value: -0,
      });
      // d = -1 -> 1200 cents
      expect(convertEndpointForReference({ unit: 'd', value: -1 }, 'scene')).toEqual({
        unit: 'cents',
        value: 1200,
      });
      // Preserves existing relative units
      expect(convertEndpointForReference({ unit: 'cents', value: 700 }, 'scene')).toEqual({
        unit: 'cents',
        value: 700,
      });
      expect(
        convertEndpointForReference(
          { unit: 'ratio', ratio: { kind: 'rational', num: 3, den: 2 } },
          'scene'
        )
      ).toEqual({
        unit: 'ratio',
        ratio: { kind: 'rational', num: 3, den: 2 },
      });
    });

    it('preserves relative units when switching between scene and anchor', () => {
      const ratioEp = { unit: 'ratio' as const, ratio: { kind: 'rational' as const, num: 5, den: 4 } };
      expect(convertEndpointForReference(ratioEp, 'anchor')).toEqual(ratioEp);
      expect(convertEndpointForReference(ratioEp, 'scene')).toEqual(ratioEp);

      const centsEp = { unit: 'cents' as const, value: 386.31 };
      expect(convertEndpointForReference(centsEp, 'anchor')).toEqual(centsEp);
      expect(convertEndpointForReference(centsEp, 'scene')).toEqual(centsEp);
    });
  });
});
