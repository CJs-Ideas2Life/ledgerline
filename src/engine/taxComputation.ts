// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  BRACKETS,
  CG_FIFTEEN_RATE_MAX,
  CG_ZERO_RATE_MAX,
  TAX_TABLE_LIMIT,
  type FilingStatus,
} from './constants2025';
import { cents, dollars, pos } from './money';

/** Exact tax from the § 1 rate schedule (unrounded). */
export function scheduleTax(taxableIncome: number, status: FilingStatus): number {
  let tax = 0;
  let lower = 0;
  for (const b of BRACKETS[status]) {
    if (taxableIncome <= lower) break;
    const top = Math.min(taxableIncome, b.upTo);
    tax += (top - lower) * b.rate;
    lower = b.upTo;
  }
  return tax;
}

/** Marginal ordinary rate at a given taxable income. */
export function marginalRate(taxableIncome: number, status: FilingStatus): number {
  for (const b of BRACKETS[status]) if (taxableIncome <= b.upTo) return b.rate;
  return 0.37;
}

/**
 * The row of the 2025 Tax Table containing `ti` (taxable income < $100,000).
 * Rows: [0,5), [5,15), [15,25), then $25 rows up to $3,000, then $50 rows.
 */
export function taxTableRow(ti: number): { atLeast: number; lessThan: number } {
  if (ti < 5) return { atLeast: 0, lessThan: 5 };
  if (ti < 15) return { atLeast: 5, lessThan: 15 };
  if (ti < 25) return { atLeast: 15, lessThan: 25 };
  if (ti < 3_000) {
    const lo = Math.floor(ti / 25) * 25;
    return { atLeast: lo, lessThan: lo + 25 };
  }
  const lo = Math.floor(ti / 50) * 50;
  return { atLeast: lo, lessThan: lo + 50 };
}

/** Tax Table amount: tax on the row midpoint, rounded to whole dollars. */
export function taxTable(ti: number, status: FilingStatus): number {
  if (ti < 5) return 0;
  const { atLeast, lessThan } = taxTableRow(ti);
  return dollars(scheduleTax((atLeast + lessThan) / 2, status));
}

/** Tax Computation Worksheet (taxable income >= $100,000): cents, then whole dollars. */
export function taxComputationWorksheet(ti: number, status: FilingStatus): number {
  return dollars(cents(scheduleTax(ti, status)));
}

/** "Figure the tax" the way Form 1040 line 16 instructions require. */
export function regularTax(ti: number, status: FilingStatus): number {
  const t = pos(ti);
  return t < TAX_TABLE_LIMIT ? taxTable(t, status) : taxComputationWorksheet(t, status);
}

/**
 * Qualified Dividends and Capital Gain Tax Worksheet—Line 16 (2025),
 * Form 1040 instructions p. 38. Returns every worksheet line.
 */
export function qdcgWorksheet(
  taxableIncome: number,
  qualifiedDividends: number,
  capitalGain: number,
  status: FilingStatus,
): Record<string, number> {
  const l: Record<string, number> = {};
  l['1'] = pos(taxableIncome);
  l['2'] = pos(qualifiedDividends);
  l['3'] = pos(capitalGain);
  l['4'] = l['2'] + l['3'];
  l['5'] = pos(l['1'] - l['4']);
  l['6'] = CG_ZERO_RATE_MAX[status];
  l['7'] = Math.min(l['1'], l['6']);
  l['8'] = Math.min(l['5'], l['7']);
  l['9'] = l['7'] - l['8'];
  l['10'] = Math.min(l['1'], l['4']);
  l['11'] = l['9'];
  l['12'] = l['10'] - l['11'];
  l['13'] = CG_FIFTEEN_RATE_MAX[status];
  l['14'] = Math.min(l['1'], l['13']);
  l['15'] = l['5'] + l['9'];
  l['16'] = pos(l['14'] - l['15']);
  l['17'] = Math.min(l['12'], l['16']);
  l['18'] = dollars(l['17'] * 0.15);
  l['19'] = l['9'] + l['17'];
  l['20'] = l['10'] - l['19'];
  l['21'] = dollars(l['20'] * 0.2);
  l['22'] = regularTax(l['5'], status);
  l['23'] = l['18'] + l['21'] + l['22'];
  l['24'] = regularTax(l['1'], status);
  l['25'] = Math.min(l['23'], l['24']);
  return l;
}
