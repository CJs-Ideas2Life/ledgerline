// SPDX-License-Identifier: AGPL-3.0-or-later
/** Round to whole dollars the IRS way: .50 and up rounds away from zero. */
export function dollars(x: number): number {
  if (!Number.isFinite(x)) return 0;
  const sign = x < 0 ? -1 : 1;
  // tiny epsilon removes binary floating-point noise such as 0.4999999999
  return sign * Math.round(Math.abs(x) + 1e-9) || 0;
}

/** Round to cents (used inside the Tax Computation Worksheet). */
export function cents(x: number): number {
  const sign = x < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(x) * 100 + 1e-7)) / 100;
}

export const pos = (x: number) => (x > 0 ? x : 0);

export type MoneyParse =
  | { ok: true; value: number }
  | { ok: false; error: string; raw: unknown };

/**
 * Parse a monetary user/saved value. Empty is an explicit zero.
 * Rejects nonfinite numbers, negatives (unless allowed), and trailing junk such as "40000oops".
 */
export function parseMoneyInput(raw: unknown, opts?: { allowNegative?: boolean }): MoneyParse {
  if (raw === '' || raw === null || raw === undefined) return { ok: true, value: 0 };
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return { ok: false, error: 'Amount is not a finite number.', raw };
    if (!opts?.allowNegative && raw < 0) return { ok: false, error: 'Amount cannot be negative.', raw };
    return { ok: true, value: dollars(raw) };
  }
  const s = String(raw).trim();
  if (s === '') return { ok: true, value: 0 };
  const cleaned = s.replace(/[$,\s]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    return { ok: false, error: 'Enter a number only (no extra characters).', raw };
  }
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return { ok: false, error: 'Amount is not a finite number.', raw };
  if (!opts?.allowNegative && n < 0) return { ok: false, error: 'Amount cannot be negative.', raw };
  return { ok: true, value: dollars(n) };
}

/**
 * Coerce for internal arithmetic. Invalid values become 0 here only after
 * `validateMoneyFields` has already recorded them — do not treat this as acceptance.
 */
export function amt(x: unknown): number {
  const parsed = parseMoneyInput(x);
  if (!parsed.ok) return 0;
  return parsed.value;
}

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
