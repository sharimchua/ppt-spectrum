/**
 * Pure display formatting utilities for Filter UI elements.
 * Follows Australian English spelling conventions.
 */

import { Filter, FilterCondition, RangeCondition, CycleCondition } from '../../core/filter-types';
import { formatEndpoint } from '../../core/endpoint-parse';

export function formatRangeConditionSummary(cond: RangeCondition): string {
  const refLabel = cond.reference === 'scene'
    ? 'Scene'
    : cond.reference === 'anchor'
      ? 'Anchor'
      : 'Absolute';

  const spanSummaries = cond.spans.map((s) => {
    if (s.lo && s.hi) {
      return `${formatEndpoint(s.lo)} to ${formatEndpoint(s.hi)}`;
    }
    if (s.lo) {
      return `from ${formatEndpoint(s.lo)}`;
    }
    if (s.hi) {
      return `up to ${formatEndpoint(s.hi)}`;
    }
    return 'all frequencies';
  });

  const spanText = spanSummaries.length > 0 ? spanSummaries.join(', ') : 'Empty span';
  const reductionText = cond.reductionPeriod ? ' (Reduced)' : '';
  return `${refLabel}: ${spanText}${reductionText}`;
}

export function formatCycleConditionSummary(cond: CycleCondition): string {
  const activeHits = cond.slotWeights.filter((w) => w > 0.5).length;
  const superText = cond.supercycle ? ` · Supercycle ${cond.supercycle.length}x` : '';
  return `${activeHits}/${cond.divisions} slots active${superText}`;
}

export function formatConditionSummary(cond: FilterCondition): string {
  if (cond.kind === 'range') {
    return formatRangeConditionSummary(cond);
  }
  return formatCycleConditionSummary(cond);
}

export function describeFilter(filter: Filter): string {
  if (!filter.enabled) {
    return 'Filter bypassed (clean unattenuated spectrum)';
  }

  const condCount = filter.conditions.length;
  if (condCount === 0) {
    return 'Filter active with no conditions (unity pass)';
  }

  const actionVerb = filter.action === 'remove' ? 'Remove' : 'Keep';
  const combineWord = filter.combine === 'all' ? 'all' : 'any';
  const depthText = filter.depth < 1.0 ? ` (${Math.round(filter.depth * 100)}% depth)` : '';

  return `${actionVerb} onsets and partials matching ${combineWord} of the ${condCount} active ${
    condCount === 1 ? 'condition' : 'conditions'
  }${depthText}.`;
}
