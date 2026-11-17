/**
 * Pure canvas label layout helpers for preventing overlapping text,
 * clipping off-canvas strings, and thinning dense axis tick labels.
 */

export type HorizontalInterval = [number, number];

/**
 * Truncates `text` with a single-character ellipsis (`…`) so its measured width
 * does not exceed `maxWidth`. Returns `''` if `maxWidth <= 0`.
 */
export function truncateTextToFit(
  measureWidth: (s: string) => number,
  text: string,
  maxWidth: number
): string {
  if (maxWidth <= 0 || text.length === 0) return '';
  if (measureWidth(text) <= maxWidth) return text;

  const ellipsis = '…';
  if (measureWidth(ellipsis) > maxWidth) return '';

  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (measureWidth(text.slice(0, mid) + ellipsis) <= maxWidth) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo > 0 ? text.slice(0, lo) + ellipsis : ellipsis;
}

/**
 * Computes an integer step (1, 2, 4, 8, ...) for labelling `totalTicks`
 * across `spanPx` so adjacent labels maintain at least `minLabelSpacingPx`.
 */
export function computeTickLabelStep(
  totalTicks: number,
  spanPx: number,
  minLabelSpacingPx: number
): number {
  if (totalTicks <= 1 || spanPx <= 0 || minLabelSpacingPx <= 0) return 1;
  const pxPerTick = spanPx / totalTicks;
  if (pxPerTick >= minLabelSpacingPx) return 1;
  const rawStep = Math.ceil(minLabelSpacingPx / pxPerTick);
  let step = 1;
  while (step < rawStep) {
    step *= 2;
  }
  return step;
}

/**
 * Checks whether a horizontal label centred at `x` with half-width `halfW`
 * can be placed without overlapping any interval in `occupied` (with `minGapPx` padding).
 * When placement succeeds, records the new interval in `occupied` and returns `true`.
 */
export function canPlaceHorizontalLabel(
  x: number,
  halfW: number,
  occupied: HorizontalInterval[],
  minGapPx: number = 4
): boolean {
  const left = x - halfW - minGapPx;
  const right = x + halfW + minGapPx;
  for (let i = 0; i < occupied.length; i++) {
    const [oLeft, oRight] = occupied[i];
    if (left < oRight && right > oLeft) {
      return false;
    }
  }
  occupied.push([x - halfW, x + halfW]);
  return true;
}
