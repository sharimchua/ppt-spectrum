/**
 * Builds Supercycle Band-Filter metric-modulation demos for Section 7 (Tempo Cadences).
 * Each cadence places harmonic tempo partials on a shared Sam and uses a Supercycle
 * Range Filter (`combine: 'any'`) to pass one tempo band per rotation.
 */

import { Filter, RangeCondition } from '../../core/types';
import { CustomTutorialDemoOverride } from './tutorial-demos';

function makeBandCondition(
  id: string,
  centerCents: number,
  cycleWeights: number[]
): RangeCondition {
  return {
    kind: 'range',
    id,
    enabled: true,
    reference: 'scene',
    reductionPeriod: null,
    spans: [
      {
        lo: { unit: 'cents', value: centerCents - 45 },
        hi: { unit: 'cents', value: centerCents + 45 },
      },
    ],
    softness: { value: 25, unit: 'cents' },
    supercycle: {
      length: cycleWeights.length,
      cycleWeights,
    },
  };
}

function makeSupercycleBandFilter(
  id: string,
  name: string,
  description: string,
  conditions: RangeCondition[]
): Filter {
  return {
    id,
    name,
    origin: 'user',
    category: 'rhythm',
    description,
    enabled: true,
    action: 'keep',
    combine: 'any',
    depth: 1.0,
    conditions,
    focus: { conditionId: conditions[0].id, spanIndex: 0 },
    centreD: 0,
    widthD: 0.25,
    softnessD: 0.05,
    mode: 'band-pass',
    trackingMode: 'relative',
  };
}

export function buildTempoCadenceOverride(cadenceId: string): CustomTutorialDemoOverride {
  if (cadenceId === 'perfect-3-2') {
    const conds = [
      makeBandCondition('cad-3-2-so', 702, [1, 0]),
      makeBandCondition('cad-3-2-do', 0, [0, 1]),
    ];
    return {
      title: 'Tempo Cadence: So (145 BPM) → Do (96.8 BPM) [3:2]',
      shortTitle: 'So → Do (3:2)',
      badge: 'Supercycle · 3:2 Modulation',
      listenHint:
        'A Supercycle Band Filter passes So (3:2 = 145.1 BPM) on rotation 1, then Do (1:1 = 96.75 BPM) on rotation 2—modulating cleanly across The Sam!',
      pitchCarrier: 'kit',
      customPartials: [
        { ratioVal: 1, num: 1, den: 1, amp: 1.0, label: 'Do (1×)' },
        { ratioVal: 1.5, num: 3, den: 2, amp: 1.0, label: 'So (3:2)' },
      ],
      customFilter: makeSupercycleBandFilter(
        'user-filter-cadence-3-2',
        '3:2 Tempo Cadence (So → Do)',
        'Alternates between the 3:2 band and 1:1 root across 2 supercycle rotations.',
        conds
      ),
    };
  }

  if (cadenceId === 'plagal-4-3') {
    const conds = [
      makeBandCondition('cad-4-3-fa', 498, [1, 0]),
      makeBandCondition('cad-4-3-do', 0, [0, 1]),
    ];
    return {
      title: 'Tempo Cadence: Fa (129 BPM) → Do (96.8 BPM) [4:3]',
      shortTitle: 'Fa → Do (4:3)',
      badge: 'Supercycle · 4:3 Modulation',
      listenHint:
        'A Supercycle Band Filter passes Fa (4:3 = 129.0 BPM) on rotation 1, then Do (1:1 = 96.75 BPM) on rotation 2—a 4:3 Plagal metric modulation!',
      pitchCarrier: 'kit',
      customPartials: [
        { ratioVal: 1, num: 1, den: 1, amp: 1.0, label: 'Do (1×)' },
        { ratioVal: 4 / 3, num: 4, den: 3, amp: 1.0, label: 'Fa (4:3)' },
      ],
      customFilter: makeSupercycleBandFilter(
        'user-filter-cadence-4-3',
        '4:3 Tempo Cadence (Fa → Do)',
        'Alternates between the 4:3 band and 1:1 root across 2 supercycle rotations.',
        conds
      ),
    };
  }

  const conds = [
    makeBandCondition('cad-triad-do', 0, [1, 0, 0, 0]),
    makeBandCondition('cad-triad-mi', 386.3, [0, 1, 0, 0]),
    makeBandCondition('cad-triad-so', 702, [0, 0, 1, 0]),
    makeBandCondition('cad-triad-do2', 1200, [0, 0, 0, 1]),
  ];
  return {
    title: 'Tempo Phrase: Do → Mi → So → Do′ (4:5:6:8)',
    shortTitle: '4:5:6 Tempo Phrase',
    badge: 'Supercycle · 4:5:6:8',
    listenHint:
      'A 4-step Supercycle Band Filter steps through Do (1:1), Mi (5:4), So (3:2), and Do′ (2:1) on successive rotations—an arpeggiated tempo melody!',
    pitchCarrier: 'kit',
    customPartials: [
      { ratioVal: 1, num: 1, den: 1, amp: 1.0, label: 'Do (1×)' },
      { ratioVal: 1.25, num: 5, den: 4, amp: 1.0, label: 'Mi (5:4)' },
      { ratioVal: 1.5, num: 3, den: 2, amp: 1.0, label: 'So (3:2)' },
      { ratioVal: 2, num: 2, den: 1, amp: 1.0, label: 'Do′ (2×)' },
    ],
    customFilter: makeSupercycleBandFilter(
      'user-filter-cadence-4-5-6',
      '4:5:6:8 Tempo Arpeggio',
      'Steps through 1:1, 5:4, 3:2, and 2:1 tempo bands across 4 supercycle rotations.',
      conds
    ),
  };
}
