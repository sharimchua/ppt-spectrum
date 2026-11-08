import { Ratio } from './types';

/**
 * Greatest common divisor using Euclid's algorithm.
 */
export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

/**
 * Least common multiple.
 */
export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(Math.round(a * b)) / gcd(a, b);
}

/**
 * Reduces a rational fraction to simplest terms.
 */
export function reduceRational(num: number, den: number): { num: number; den: number } {
  if (den === 0) throw new Error('Division by zero in rational');
  const d = gcd(num, den);
  const sign = den < 0 ? -1 : 1;
  return {
    num: (sign * Math.round(num)) / d,
    den: (sign * Math.round(den)) / d,
  };
}

/**
 * Converts a Ratio into its numeric floating-point value.
 */
export function ratioToValue(r: Ratio): number {
  if (r.kind === 'rational') {
    return r.num / r.den;
  }
  return r.value;
}

/**
 * Rationalises a real value into an exact fraction using continued fractions.
 * Stops when the error is below tolerance or maxDenominator is reached.
 */
export function rationalise(val: number, tolerance: number = 0.001, maxDenominator: number = 1000): { num: number; den: number } {
  if (val <= 0) return { num: 0, den: 1 };
  let m00 = 1, m01 = 0, m10 = 0, m11 = 1;
  let x = val;
  while (m10 * (Math.floor(x)) + m11 <= maxDenominator) {
    const a = Math.floor(x);
    const t0 = m00 * a + m01;
    m01 = m00;
    m00 = t0;
    const t1 = m10 * a + m11;
    m11 = m10;
    m10 = t1;
    if (x === a) break;
    x = 1 / (x - a);
    if (Math.abs(val - m00 / m10) < tolerance) break;
  }
  return reduceRational(m00, m10);
}

/**
 * Prime factors of a positive integer.
 */
export function primeFactors(n: number): number[] {
  let val = Math.abs(Math.round(n));
  const factors: number[] = [];
  let d = 2;
  while (val >= 2) {
    while (val % d === 0) {
      factors.push(d);
      val /= d;
    }
    d++;
    if (d * d > val) {
      if (val > 1) factors.push(val);
      break;
    }
  }
  return factors;
}

/**
 * Highest prime factor (prime limit).
 */
export function primeLimit(n: number): number {
  const factors = primeFactors(n);
  return factors.length === 0 ? 1 : Math.max(...factors);
}
