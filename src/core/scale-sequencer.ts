/**
 * Pure algorithmic scale & tuning-lattice sequencer.
 * Operates over any Layer 1 Tuning System + Layer 2 Tuning Subset using
 * dual-coordinate steps (diatonic/subset delta + chromatic/lattice delta)
 * and standard arpeggiator/sequencer boundary rules.
 */

export interface SequencerStep {
  /** Diatonic / Tuning Subset step movement (+1 = next active degree, +2 = skip, -1 = down). */
  scaleDelta: number;
  /** Chromatic / Tuning System lattice offset (0 = diatonic, -1/+1 = lattice inflection). */
  chromaticDelta?: number;
}

export type BoundaryRule = 'wrap' | 'bounce' | 'mirror' | 'once';

export type SequencePatternId =
  | 'step-up'
  | 'step-down'
  | 'skip-up'
  | 'broken-step'
  | 'arp-3'
  | 'arp-4'
  | 'chromatic-approach'
  | 'custom';

export interface SequencePatternPreset {
  id: SequencePatternId;
  label: string;
  description: string;
  mode: 'walker' | 'arp';
  steps: SequencerStep[];
  rootAdvance?: number;
}

export const BOUNDARY_RULES: Array<{ id: BoundaryRule; label: string; description: string }> = [
  { id: 'wrap', label: 'Wrap', description: 'Loop back to the start when reaching the period boundary' },
  { id: 'bounce', label: 'Up / Down', description: 'Reverse direction (pendulum) at the boundary' },
  { id: 'mirror', label: 'Mirror', description: 'Invert interval signs (+ becomes -) at the boundary' },
  { id: 'once', label: 'One-Shot', description: 'Play once to the boundary and stop' },
];

export const SEQUENCE_PATTERNS: SequencePatternPreset[] = [
  {
    id: 'step-up',
    label: 'Step Up (+1)',
    description: 'Walk upwards one active subset degree per step',
    mode: 'walker',
    steps: [{ scaleDelta: 1 }],
  },
  {
    id: 'step-down',
    label: 'Step Down (-1)',
    description: 'Walk downwards one active subset degree per step',
    mode: 'walker',
    steps: [{ scaleDelta: -1 }],
  },
  {
    id: 'skip-up',
    label: 'Skip (+2)',
    description: 'Walk in skipped-degree (+2) steps through the active subset',
    mode: 'walker',
    steps: [{ scaleDelta: 2 }],
  },
  {
    id: 'broken-step',
    label: 'Broken (+2, -1)',
    description: 'Alternating +2 / -1 melodic step climb',
    mode: 'walker',
    steps: [{ scaleDelta: 2 }, { scaleDelta: -1 }],
  },
  {
    id: 'arp-3',
    label: '3-Note Arp',
    description: 'Anchored 3-note cell (0, +2, +4) stepping through the subset',
    mode: 'arp',
    steps: [{ scaleDelta: 0 }, { scaleDelta: 2 }, { scaleDelta: 4 }],
    rootAdvance: 1,
  },
  {
    id: 'arp-4',
    label: '4-Note Arp',
    description: 'Anchored 4-note cell (0, +2, +4, +6) stepping through the subset',
    mode: 'arp',
    steps: [{ scaleDelta: 0 }, { scaleDelta: 2 }, { scaleDelta: 4 }, { scaleDelta: 6 }],
    rootAdvance: 1,
  },
  {
    id: 'chromatic-approach',
    label: 'Lattice Approach',
    description: 'Approach each subset degree from 1 Tuning System lattice step below',
    mode: 'arp',
    steps: [{ scaleDelta: 0, chromaticDelta: -1 }, { scaleDelta: 0, chromaticDelta: 0 }],
    rootAdvance: 1,
  },
  {
    id: 'custom',
    label: 'Custom Steps',
    description: 'User-defined diatonic + chromatic step sequence',
    mode: 'walker',
    steps: [{ scaleDelta: 2 }, { scaleDelta: -1 }, { scaleDelta: 1 }],
  },
];

export interface SequencerTarget {
  /** Index in activeDegrees (or -1 if chromatically inflected outside activeDegrees). */
  activeIndex: number;
  /** Index in allDegrees (Layer 1 Tuning System lattice). */
  systemDegreeIndex: number;
  /** Period/Octave offset relative to root (0 = base period, +1 = next period up). */
  periodOffset: number;
}

export interface SequenceBuildOptions {
  activeDegreeIndices: number[];
  systemSize: number;
  patternId: SequencePatternId;
  customSteps?: SequencerStep[];
  boundaryRule?: BoundaryRule;
  periodSpan?: number;
}

function resolveUnwrappedPosition(
  unwrappedScalePos: number,
  chromaticDelta: number,
  activeDegreeIndices: number[],
  systemSize: number
): SequencerTarget {
  const dCount = activeDegreeIndices.length;
  const basePeriod = Math.floor(unwrappedScalePos / dCount);
  const activePos = ((unwrappedScalePos % dCount) + dCount) % dCount;
  const baseSystemIdx = activeDegreeIndices[activePos];

  const rawSystemIdx = baseSystemIdx + chromaticDelta;
  const extraPeriod = Math.floor(rawSystemIdx / systemSize);
  const systemDegreeIndex = ((rawSystemIdx % systemSize) + systemSize) % systemSize;
  const periodOffset = basePeriod + extraPeriod;

  const activeIndex =
    chromaticDelta === 0 ? activePos : activeDegreeIndices.indexOf(systemDegreeIndex);

  return {
    activeIndex,
    systemDegreeIndex,
    periodOffset,
  };
}

function buildArpTargets(
  activeDegreeIndices: number[],
  systemSize: number,
  steps: SequencerStep[],
  rootAdvance: number,
  boundaryRule: BoundaryRule,
  periodSpan: number
): SequencerTarget[] {
  const dCount = activeDegreeIndices.length;
  const safeAdvance = Math.max(1, Math.abs(rootAdvance));
  const maxRoot = boundaryRule === 'wrap' ? dCount * periodSpan - 1 : dCount * periodSpan;
  const roots: Array<{ root: number; reverseCell: boolean; invertCell: boolean }> = [];

  for (let r = 0; r <= maxRoot; r += safeAdvance) {
    roots.push({ root: r, reverseCell: false, invertCell: false });
  }

  if (boundaryRule === 'bounce' || boundaryRule === 'mirror') {
    const startDown = maxRoot - safeAdvance;
    for (let r = startDown; r >= safeAdvance; r -= safeAdvance) {
      roots.push({
        root: r,
        reverseCell: boundaryRule === 'bounce',
        invertCell: boundaryRule === 'mirror',
      });
    }
  }

  const targets: SequencerTarget[] = [];
  for (const entry of roots) {
    const orderedSteps = entry.reverseCell ? [...steps].reverse() : steps;
    for (const step of orderedSteps) {
      const sDelta = entry.invertCell ? -step.scaleDelta : step.scaleDelta;
      const cDelta = entry.invertCell ? -(step.chromaticDelta ?? 0) : (step.chromaticDelta ?? 0);
      targets.push(
        resolveUnwrappedPosition(entry.root + sDelta, cDelta, activeDegreeIndices, systemSize)
      );
    }
  }
  return targets;
}

function buildWalkerTargets(
  activeDegreeIndices: number[],
  systemSize: number,
  steps: SequencerStep[],
  boundaryRule: BoundaryRule,
  periodSpan: number,
  startAtTop: boolean
): SequencerTarget[] {
  const dCount = activeDegreeIndices.length;
  const maxPos = boundaryRule === 'wrap' ? dCount * periodSpan - 1 : dCount * periodSpan;
  const safeSteps = steps.length > 0 ? steps : [{ scaleDelta: 1 }];
  const targets: SequencerTarget[] = [];

  if (boundaryRule === 'wrap') {
    const totalWrapCount = dCount * periodSpan;
    let cursor = startAtTop ? maxPos : 0;
    for (let i = 0; i < totalWrapCount; i++) {
      const step = safeSteps[i % safeSteps.length];
      const wrapped = ((cursor % totalWrapCount) + totalWrapCount) % totalWrapCount;
      targets.push(
        resolveUnwrappedPosition(wrapped, step.chromaticDelta ?? 0, activeDegreeIndices, systemSize)
      );
      cursor += step.scaleDelta;
    }
    return targets;
  }

  let cursor = startAtTop ? maxPos : 0;
  let direction = 1;
  const maxIterations = Math.max(16, (maxPos + 1) * safeSteps.length * 3);

  targets.push(
    resolveUnwrappedPosition(
      cursor,
      safeSteps[0].chromaticDelta ?? 0,
      activeDegreeIndices,
      systemSize
    )
  );

  for (let i = 0; i < maxIterations; i++) {
    const rawStep = safeSteps[i % safeSteps.length];
    const effectiveScaleDelta =
      boundaryRule === 'mirror' || boundaryRule === 'bounce'
        ? rawStep.scaleDelta * direction
        : rawStep.scaleDelta;
    const effectiveChromatic =
      boundaryRule === 'mirror' ? (rawStep.chromaticDelta ?? 0) * direction : (rawStep.chromaticDelta ?? 0);

    let next = cursor + effectiveScaleDelta;

    if (next > maxPos || next < 0) {
      if (boundaryRule === 'once') {
        break;
      }
      direction = -direction;
      const bouncedDelta = rawStep.scaleDelta * direction;
      next = Math.max(0, Math.min(maxPos, cursor + bouncedDelta));
      if (next === cursor) {
        break;
      }
    }

    cursor = next;
    targets.push(
      resolveUnwrappedPosition(cursor, effectiveChromatic, activeDegreeIndices, systemSize)
    );

    if (
      (boundaryRule === 'bounce' || boundaryRule === 'mirror') &&
      i > 0 &&
      cursor === (startAtTop ? maxPos : 0) &&
      direction === -1 &&
      (i + 1) % safeSteps.length === 0
    ) {
      targets.pop();
      break;
    }
  }

  return targets;
}

/**
 * Generates an ordered list of multi-period SequencerTargets for the given
 * Layer 1 system + Layer 2 subset, pattern, and boundary rule.
 */
export function buildSequenceTargets(options: SequenceBuildOptions): SequencerTarget[] {
  const {
    activeDegreeIndices,
    systemSize,
    patternId,
    customSteps,
    boundaryRule = 'wrap',
    periodSpan = 1,
  } = options;

  if (activeDegreeIndices.length === 0 || systemSize <= 0) return [];
  const safeSpan = Math.max(1, Math.min(4, Math.round(periodSpan)));
  const preset = SEQUENCE_PATTERNS.find((p) => p.id === patternId) ?? SEQUENCE_PATTERNS[0];
  const steps =
    patternId === 'custom' && customSteps && customSteps.length > 0 ? customSteps : preset.steps;

  if (activeDegreeIndices.length === 1 && steps.every((s) => (s.chromaticDelta ?? 0) === 0)) {
    return [{ activeIndex: 0, systemDegreeIndex: activeDegreeIndices[0], periodOffset: 0 }];
  }

  if (preset.mode === 'arp') {
    return buildArpTargets(
      activeDegreeIndices,
      systemSize,
      steps,
      preset.rootAdvance ?? 1,
      boundaryRule,
      safeSpan
    );
  }

  return buildWalkerTargets(
    activeDegreeIndices,
    systemSize,
    steps,
    boundaryRule,
    safeSpan,
    patternId === 'step-down' && boundaryRule === 'wrap'
  );
}

/**
 * Evaluates the current sequence step position and target at `elapsedMs`.
 */
export function evaluateSequenceStep<T>(
  elapsedMs: number,
  stepDurationMs: number,
  targets: T[],
  boundaryRule: BoundaryRule = 'wrap'
): { stepPosition: number; target: T | null; done: boolean } {
  if (targets.length === 0) {
    return { stepPosition: 0, target: null, done: true };
  }
  const safeStepMs = Math.max(60, stepDurationMs);
  const totalSteps = targets.length;
  const rawStep = Math.floor(Math.max(0, elapsedMs) / safeStepMs);

  if (boundaryRule === 'once' && rawStep >= totalSteps) {
    return {
      stepPosition: totalSteps - 1,
      target: targets[totalSteps - 1],
      done: true,
    };
  }

  const stepPosition = ((rawStep % totalSteps) + totalSteps) % totalSteps;
  return {
    stepPosition,
    target: targets[stepPosition],
    done: false,
  };
}
