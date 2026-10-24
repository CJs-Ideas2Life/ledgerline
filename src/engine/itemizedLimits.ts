// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  CHARITY,
  MORTGAGE_DEBT_LIMIT,
  MORTGAGE_DEBT_LIMIT_MFS,
  type FilingStatus,
} from './constants2025';
import { amt, dollars, pos } from './money';
import type { Lines, Warning } from './types';

/** Apply the $750,000 ($375,000 MFS) acquisition-debt cap to entered mortgage interest. */
export function limitedMortgageInterest(
  interest: number,
  averageBalance: number,
  filingStatus: FilingStatus,
  warnings: Warning[],
): number {
  const principal = amt(averageBalance);
  const paid = amt(interest);
  if (principal <= 0 || paid <= 0) return paid;
  const cap = filingStatus === 'mfs' ? MORTGAGE_DEBT_LIMIT_MFS : MORTGAGE_DEBT_LIMIT;
  if (principal <= cap) return paid;
  const allowed = dollars(paid * (cap / principal));
  warnings.push({
    level: 'info',
    message: `Mortgage interest limited by the $${cap.toLocaleString()} acquisition-debt cap (Pub. 936): ${paid.toLocaleString()} × ${cap.toLocaleString()} / ${principal.toLocaleString()} = $${allowed.toLocaleString()}. Pre-15 Dec 2017 $1,000,000 grandfathering is not applied.`,
  });
  return allowed;
}

export function applyCharityLimits(
  cash: number,
  nonCash: number,
  carryover: number,
  agi: number,
  warnings: Warning[],
): { cash: number; nonCash: number; carryoverUsed: number; total: number; carryoverNext: number; lines: Lines } {
  const base = pos(agi);
  const cashIn = amt(cash);
  const nonCashIn = amt(nonCash);
  const carryIn = amt(carryover);
  const cashCap = dollars(base * CHARITY.cashAgiLimit);
  const nonCashCap = dollars(base * CHARITY.nonCashAgiLimit);
  const overallCap = dollars(base * CHARITY.overallAgiLimit);

  const cashAllowed = Math.min(cashIn, cashCap);
  const afterCash = pos(overallCap - cashAllowed);
  const nonCashAllowed = Math.min(nonCashIn, nonCashCap, afterCash);
  const afterCurrent = pos(overallCap - cashAllowed - nonCashAllowed);
  // Carryover is applied after current-year gifts, still inside the overall 60% cap.
  // Treat carryover as leftover 60% cash-type gifts (Pub. 526 carryover ordering is more detailed).
  const carryUsed = Math.min(carryIn, afterCurrent);
  const total = cashAllowed + nonCashAllowed + carryUsed;
  const carryoverNext = cashIn - cashAllowed + (nonCashIn - nonCashAllowed) + (carryIn - carryUsed);

  if (cashIn > cashAllowed || nonCashIn > nonCashAllowed) {
    warnings.push({
      level: 'info',
      message: `Charitable gifts limited by AGI percentages (Pub. 526): cash 60% / non-cash 30% / overall 60%. Allowed $${total.toLocaleString()}; $${carryoverNext.toLocaleString()} carries to 2026.`,
    });
  } else if (carryoverNext > 0) {
    warnings.push({
      level: 'info',
      message: `Unused charitable contribution of $${carryoverNext.toLocaleString()} carries forward (5-year limit, Pub. 526).`,
    });
  }

  const lines: Lines = {
    cashAllowed,
    nonCashAllowed,
    carryUsed,
    cashCap,
    nonCashCap,
    overallCap,
    carryoverNext,
  };
  return { cash: cashAllowed, nonCash: nonCashAllowed, carryoverUsed: carryUsed, total, carryoverNext, lines };
}

/**
 * Form 4952 investment-interest limitation.
 * Net investment income here is taxable interest + non-qualified ordinary dividends + short-term
 * capital gain (net, not less than zero). Qualified dividends and long-term capital gain are
 * excluded unless the taxpayer elects to include them (election not offered).
 */
export function form4952(
  investmentInterest: number,
  carryover: number,
  taxableInterest: number,
  ordinaryDividends: number,
  qualifiedDividends: number,
  shortTermNet: number,
  warnings: Warning[],
): { deductible: number; carryoverNext: number; lines: Lines } {
  const l: Lines = {};
  l['1'] = amt(investmentInterest);
  l['2'] = amt(carryover);
  l['3'] = l['1'] + l['2'];
  const nonQualifiedDiv = pos(amt(ordinaryDividends) - amt(qualifiedDividends));
  l['4a'] = amt(taxableInterest) + nonQualifiedDiv + pos(shortTermNet);
  l['4g'] = 0; // no election to include QD / LTCG
  l['5'] = l['4a'] + l['4g'];
  l['8'] = Math.min(l['3'], l['5']);
  l['carry'] = pos(l['3'] - l['8']);
  if (l['3'] > 0 && l['8'] < l['3']) {
    warnings.push({
      level: 'info',
      message: `Form 4952: investment interest limited to net investment income of $${l['5'].toLocaleString()}. $${l['carry'].toLocaleString()} carries to 2026. Qualified dividends and long-term capital gain are not included (no line-4g election).`,
    });
  }
  return { deductible: l['8'], carryoverNext: l['carry'], lines: l };
}
