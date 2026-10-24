// SPDX-License-Identifier: AGPL-3.0-or-later
/** IRS whole-dollar rounding: .50 and up away from zero. Independent of src/engine/money.ts. */
export function whole(x: number): number {
  if (!Number.isFinite(x)) return 0;
  const sign = x < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(x) + 1e-9) || 0;
}

/** Cents, then used by the Tax Computation Worksheet before whole-dollar rounding. */
export function toCents(x: number): number {
  const sign = x < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(x) * 100 + 1e-7)) / 100;
}

export const atLeast0 = (x: number) => (x > 0 ? x : 0);
export const money = (x: unknown): number => {
  const n = typeof x === 'number' ? x : parseFloat(String(x ?? '').replace(/[$,\s]/g, ''));
  if (!Number.isFinite(n) || n < 0) return 0;
  return whole(n);
};
export const add = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
