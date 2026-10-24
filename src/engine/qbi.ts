// SPDX-License-Identifier: AGPL-3.0-or-later
import { QBI, type FilingStatus } from './constants2025';
import { amt, dollars, pos, sum } from './money';
import type { Business, Lines, Owner, ScheduleCResult, ScheduleSEResult, Warning } from './types';
import type { SeAdjustment } from './seAdjustments';

export interface QbiResult {
  form8995: Lines;
  form8995A: Lines | null;
  deduction: number;
}

function qbiByBusiness(
  scheduleCs: ScheduleCResult[],
  ses: ScheduleSEResult[],
  adjustments: SeAdjustment[],
  businesses: Business[],
): { owner: Owner; qbi: number; w2Wages: number; ubia: number; isSstb: boolean; qualifiedTips: number }[] {
  return scheduleCs.map((c) => {
    const se = ses.find((s) => s.owner === c.owner);
    const adj = adjustments.find((a) => a.owner === c.owner);
    const profitable = scheduleCs.filter((x) => x.owner === c.owner && x.lines['31'] > 0);
    const totalProfit = sum(profitable.map((x) => x.lines['31']));
    const share = c.lines['31'] > 0 && totalProfit > 0 ? c.lines['31'] / totalProfit : 0;
    const seShare = dollars((se?.lines['13'] ?? 0) * share);
    const healthShare = dollars((adj?.health ?? 0) * share);
    const retShare = dollars(((adj?.employer ?? 0) + (adj?.elective ?? 0)) * share);
    const src = businesses.find((b) => b.id === c.id);
    return {
      owner: c.owner,
      qbi: c.lines['31'] - seShare - healthShare - retShare,
      w2Wages: amt(src?.expenses.wages ?? 0),
      ubia: amt(src?.ubia ?? 0),
      isSstb: !!src?.isSstb,
      qualifiedTips: amt(src?.qualifiedTips ?? 0),
    };
  });
}

function wageUbiaLimit(w2: number, ubia: number): number {
  return Math.max(dollars(w2 * QBI.wageLimitRate), dollars(w2 * QBI.wageLimitAltWageRate + ubia * QBI.ubiaRate));
}

/**
 * Form 8995 (below threshold) or Form 8995-A (above threshold), including the
 * W-2/UBIA limit, the phase-in range, and SSTB reduction.
 */
export function computeQbi(
  fs: FilingStatus,
  scheduleCs: ScheduleCResult[],
  ses: ScheduleSEResult[],
  adjustments: SeAdjustment[],
  businesses: Business[],
  qbiLossCarryforward: number,
  taxableIncomeBeforeQbi: number,
  qualifiedDividendsAndGains: number,
  tipsDeduction: number,
  warnings: Warning[],
): QbiResult {
  const items = qbiByBusiness(scheduleCs, ses, adjustments, businesses);
  // Qualified tips deducted under § 224 are not QBI (Form 8995-A instructions).
  // Allocate the Schedule 1-A tip deduction across businesses that reported qualified tips.
  const tipPool = amt(tipsDeduction);
  const tipBase = sum(items.map((it) => pos(it.qualifiedTips)));
  const afterTips = items.map((it) => {
    const share = tipBase > 0 ? pos(it.qualifiedTips) / tipBase : 0;
    const tipAlloc = Math.min(pos(it.qbi), dollars(tipPool * share));
    return { ...it, qbi: it.qbi - tipAlloc };
  });

  const Q: Lines = {};
  const totalQbi = sum(afterTips.map((it) => it.qbi));
  Q['2'] = totalQbi;
  Q['3'] = -amt(qbiLossCarryforward);
  Q['4'] = pos(Q['2'] + Q['3']);
  Q['5'] = dollars(Q['4'] * QBI.rate);
  Q['6'] = 0;
  Q['8'] = 0;
  Q['9'] = 0;
  Q['10'] = Q['5'] + Q['9'];
  Q['11'] = taxableIncomeBeforeQbi;
  Q['12'] = qualifiedDividendsAndGains;
  Q['13'] = pos(Q['11'] - Q['12']);
  Q['14'] = dollars(Q['13'] * QBI.rate);
  Q['16'] = Math.min(0, Q['2'] + Q['3']);

  const threshold = QBI.threshold[fs];
  const range = QBI.phaseInRange[fs];
  const above = Q['11'] > threshold;

  if (!scheduleCs.length) {
    Q['15'] = 0;
    return { form8995: Q, form8995A: null, deduction: 0 };
  }
  if (!above) {
    Q['15'] = Math.min(Q['10'], Q['14']);
    return { form8995: Q, form8995A: null, deduction: Q['15'] };
  }

  // Form 8995-A
  const A: Lines = {};
  const phaseInPct = Q['11'] >= threshold + range ? 1 : (Q['11'] - threshold) / range;
  const sstbPct = 1 - phaseInPct; // applicable percentage of SSTB still treated as qualified
  let component = 0;
  afterTips.forEach((it, i) => {
    let qbi = it.qbi;
    let w2 = it.w2Wages;
    let ubia = it.ubia;
    if (it.isSstb) {
      if (phaseInPct >= 1) {
        qbi = 0;
        w2 = 0;
        ubia = 0;
      } else {
        qbi = dollars(qbi * sstbPct);
        w2 = dollars(w2 * sstbPct);
        ubia = dollars(ubia * sstbPct);
      }
    }
    const twenty = dollars(pos(qbi) * QBI.rate);
    const limit = wageUbiaLimit(w2, ubia);
    const uncapped = twenty;
    let allowed: number;
    if (phaseInPct >= 1) {
      allowed = qbi <= 0 ? 0 : Math.min(uncapped, limit);
    } else {
      const excess = pos(uncapped - limit);
      allowed = pos(uncapped - dollars(excess * phaseInPct));
    }
    A[`biz${i + 1}Qbi`] = qbi;
    A[`biz${i + 1}Twenty`] = twenty;
    A[`biz${i + 1}Limit`] = limit;
    A[`biz${i + 1}`] = allowed;
    component += allowed;
  });
  A['phaseInPct'] = dollars(phaseInPct * 100);
  A['sstbPct'] = dollars(sstbPct * 100);
  // Apply prior-year QBI loss after the per-business limitation (simplified: reduce the component).
  const netQbi = pos(sum(afterTips.map((it) => it.qbi)) - amt(qbiLossCarryforward));
  const afterLoss = Math.min(component, dollars(netQbi * QBI.rate));
  A['10'] = afterLoss;
  A['11'] = Q['11'];
  A['12'] = Q['12'];
  A['13'] = Q['13'];
  A['14'] = Q['14'];
  A['15'] = Math.min(A['10'], A['14']);
  Q['15'] = A['15'];
  Q['10'] = A['10'];

  if (afterTips.some((it) => it.isSstb) && phaseInPct >= 1) {
    warnings.push({
      level: 'info',
      message: 'Specified service trade or business: taxable income is above the Form 8995-A phase-in range, so SSTB QBI is excluded.',
    });
  } else if (phaseInPct >= 1 && A['15'] === 0) {
    warnings.push({
      level: 'info',
      message: 'Form 8995-A: the W-2 wage / UBIA limit reduced the QBI deduction to $0. Enter W-2 wages paid and UBIA of qualified property if they apply.',
    });
  } else {
    warnings.push({
      level: 'info',
      message: `Form 8995-A applies (taxable income before QBI $${Q['11'].toLocaleString()} is above the $${threshold.toLocaleString()} threshold).`,
    });
  }
  return { form8995: Q, form8995A: A, deduction: A['15'] };
}
