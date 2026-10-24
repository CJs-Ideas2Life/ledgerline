// SPDX-License-Identifier: AGPL-3.0-or-later
import { EIC } from './constants2025';
import { creditEligibility } from './eligibility';
import { amt, dollars, pos, sum } from './money';
import type { Lines, TaxReturnInput, Warning } from './types';

/**
 * Official 2025 EIC table construction (Form 1040 instructions / Pub. 596 table):
 *
 * 1. Ordinary rows are $50 bands. The printed credit is the statutory § 32 amount
 *    at the midpoint of the *containing* interval.
 * 2. The first printed row is $1–$50 (not $0–$50).
 * 3. The row that contains the earned-income amount (start of the plateau) prints
 *    the maximum credit, not the midpoint-evaluated amount still climbing toward it.
 * 4. If the phase-out start falls strictly inside a $50 band, that band still
 *    prints the maximum credit. If it falls on a band edge, that band is the
 *    first reduced row (midpoint is already in phase-out).
 * 5. Completed-phaseout cutoffs are not $50 boundaries. The last interval is
 *    [floor50(complete − 1), complete) with the leftover credit, and income at or
 *    above `complete` is $0. Those leftover cells are the starred terminal rows.
 *
 * This rule reproduces every ordinary cell and starred leftover in the 2025
 * instructions table (see tests/engine/eicTable2025.json).
 */
export function eicTableRowBounds(income: number, complete: number): { lo: number; hi: number } | null {
  if (income <= 0 || income >= complete) return null;
  let lo = Math.floor(income / 50) * 50;
  if (lo === 0) lo = 1;
  const naturalHi = lo === 1 ? 50 : lo + 50;
  return { lo, hi: Math.min(naturalHi, complete) };
}

/** Midpoint of the official containing row (partial at the cutoff). */
export function eicTableMidpoint(income: number, complete?: number): number {
  if (income <= 0) return 0;
  const cap = complete ?? Number.POSITIVE_INFINITY;
  const bounds = eicTableRowBounds(income, cap);
  if (!bounds) return 0;
  return (bounds.lo + bounds.hi) / 2;
}

/** Statutory § 32 credit evaluated at a single income figure. */
export function eicStatutoryAt(income: number, children: 0 | 1 | 2 | 3, joint: boolean): number {
  const phaseStart = (joint ? EIC.phaseoutStart.joint : EIC.phaseoutStart.other)[children];
  const complete = (joint ? EIC.completedPhaseout.joint : EIC.completedPhaseout.other)[children];
  if (income <= 0 || income >= complete) return 0;
  const raw = dollars(Math.min(income, EIC.earnedIncomeAmount[children]) * EIC.creditRate[children]);
  const beforePhase = Math.min(EIC.maxCredit[children], raw);
  const excess = pos(income - phaseStart);
  return pos(beforePhase - dollars(excess * EIC.phaseoutRate[children]));
}

/** One official EIC-table lookup for the containing row (or leftover terminal interval). */
export function eicTableLookup(income: number, children: 0 | 1 | 2 | 3, joint: boolean): number {
  const complete = (joint ? EIC.completedPhaseout.joint : EIC.completedPhaseout.other)[children];
  const bounds = eicTableRowBounds(income, complete);
  if (!bounds) return 0;
  const mid = (bounds.lo + bounds.hi) / 2;
  const eia = EIC.earnedIncomeAmount[children];
  const phaseStart = (joint ? EIC.phaseoutStart.joint : EIC.phaseoutStart.other)[children];
  let evalAt = mid;
  // The printed row that contains the earned-income amount shows the maximum credit.
  if (eia >= bounds.lo && eia < bounds.hi) evalAt = Math.max(evalAt, eia);
  // The printed row that contains the phase-out start still shows the maximum credit.
  if (phaseStart > bounds.lo && phaseStart < bounds.hi) evalAt = Math.min(evalAt, phaseStart);
  return eicStatutoryAt(evalAt, children, joint);
}

/**
 * Earned Income Credit from the printed 2025 EIC table (Form 1040 instructions).
 * Look up earned income; if AGI differs, look up AGI and take the smaller credit.
 * Unanswered eligibility is not treated as established — credit stays 0.
 */
export function earnedIncomeCredit(
  input: TaxReturnInput,
  agi: number,
  earnedIncome: number,
  investmentIncome: number,
  warnings: Warning[],
): { credit: number; lines: Lines; incomplete: boolean } {
  const l: Lines = {};
  const elig = creditEligibility(input);
  const n = elig.eicChildren as 0 | 1 | 2 | 3;
  l['kids'] = n;
  l['earned'] = earnedIncome;
  l['agi'] = agi;
  l['invest'] = investmentIncome;

  const ineligible = (incomplete = false): { credit: number; lines: Lines; incomplete: boolean } => {
    l['credit'] = 0;
    return { credit: 0, lines: l, incomplete };
  };

  if (input.canBeClaimedAsDependent == null || elig.eicTaxpayerOk == null || (n === 0 && elig.eicChildlessAgeOk == null)) {
    warnings.push({
      level: 'warn',
      message: 'Earned income credit is not computed until household, SSN, and age facts are answered.',
    });
    return ineligible(true);
  }
  if (input.canBeClaimedAsDependent) return ineligible();
  if (input.filingStatus === 'mfs' && input.mfsLivedApart !== true) {
    if (earnedIncome > 0) {
      warnings.push({
        level: 'info',
        message: 'Earned income credit is not allowed on a married-filing-separately return unless you lived apart from your spouse for the last 6 months of 2025 (§ 32(d)).',
      });
    }
    return ineligible(input.mfsLivedApart == null);
  }
  if (elig.eicTaxpayerOk === false) {
    warnings.push({ level: 'info', message: 'Earned income credit requires a Social Security number valid for employment for you (and your spouse if filing jointly).' });
    return ineligible();
  }
  if (n === 0 && elig.eicChildlessAgeOk === false) {
    return ineligible();
  }
  if (investmentIncome > EIC.investmentIncomeLimit) {
    warnings.push({
      level: 'info',
      message: `Earned income credit is disallowed: investment income $${investmentIncome.toLocaleString()} exceeds the 2025 limit of $${EIC.investmentIncomeLimit.toLocaleString()} (Rev. Proc. 2024-40 § 3.06(2)).`,
    });
    return ineligible();
  }
  if (earnedIncome <= 0) return ineligible();

  const joint = input.filingStatus === 'mfj';
  const fromEarned = eicTableLookup(earnedIncome, n, joint);
  const fromAgi = agi === earnedIncome ? fromEarned : eicTableLookup(agi, n, joint);
  const credit = Math.min(fromEarned, fromAgi);
  const complete = (joint ? EIC.completedPhaseout.joint : EIC.completedPhaseout.other)[n];
  l['earnedMid'] = eicTableMidpoint(earnedIncome, complete);
  l['agiMid'] = eicTableMidpoint(agi, complete);
  l['fromEarned'] = fromEarned;
  l['fromAgi'] = fromAgi;
  l['credit'] = credit;
  return { credit, lines: l, incomplete: false };
}

export function eicInvestmentIncome(
  taxableInterest: number,
  ordinaryDividends: number,
  capGainDistributions: number,
  scheduleDLine16: number,
): number {
  const gain = scheduleDLine16 !== 0 ? pos(scheduleDLine16) : amt(capGainDistributions);
  return sum([amt(taxableInterest), amt(ordinaryDividends), gain]);
}
