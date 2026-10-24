// SPDX-License-Identifier: AGPL-3.0-or-later
import { ESTIMATED_TAX, type FilingStatus } from './constants2025';
import { amt, dollars, pos } from './money';
import type { Lines, Warning } from './types';

/**
 * Form 2210 (2025) regular method under the equal-installment assumption that
 * the retired short method required: withholding treated as paid equally;
 * estimated payments treated as paid in four equal timely amounts.
 * Rate is 7% for every window (2025 Q2–Q4 and 2026 Q1).
 */
export function form2210(opts: {
  fs: FilingStatus;
  currentYearTax: number;
  withholding: number;
  estimatedPayments: number;
  priorYearTax: number;
  priorYearAgi: number;
  refundableCredits: number;
  warnings: Warning[];
}): { penalty: number; lines: Lines } {
  const { fs, currentYearTax, withholding, estimatedPayments, priorYearTax, priorYearAgi, refundableCredits, warnings } = opts;
  const l: Lines = {};
  // Form 2210 line 1 ≈ total tax after nonrefundable credits, plus other taxes,
  // minus refundable credits other than withholding (EIC / ACTC).
  const tax = pos(currentYearTax - amt(refundableCredits));
  l['1'] = tax;
  l['4'] = dollars(tax * ESTIMATED_TAX.currentYearPct);
  const high = priorYearAgi > (fs === 'mfs' ? ESTIMATED_TAX.highIncomeAgiMfs : ESTIMATED_TAX.highIncomeAgi);
  const priorPct = high ? ESTIMATED_TAX.priorYearHighIncomePct : ESTIMATED_TAX.priorYearPct;
  l['8'] = priorYearTax > 0 ? dollars(priorYearTax * priorPct) : l['4'];
  l['9'] = priorYearTax > 0 ? Math.min(l['4'], l['8']) : l['4'];
  l['wh'] = amt(withholding);
  l['est'] = amt(estimatedPayments);
  l['11'] = l['wh'] + l['est'];
  // No penalty if tax after withholding is under $1,000, or payments meet the required annual payment.
  if (pos(tax - l['wh']) < ESTIMATED_TAX.penaltyThreshold || l['11'] >= l['9'] || l['9'] <= 0) {
    l['19'] = 0;
    return { penalty: 0, lines: l };
  }
  const requiredEach = dollars(l['9'] / 4);
  const withheldEach = dollars(l['wh'] / 4);
  const estEach = dollars(l['est'] / 4);
  let penalty = 0;
  let unpaid = 0;
  for (let i = 0; i < 4; i++) {
    const due = requiredEach;
    const paid = withheldEach + estEach;
    unpaid = pos(unpaid + due - paid);
    const qPenalty = dollars(unpaid * ESTIMATED_TAX.annualRate * (ESTIMATED_TAX.days[i] / 365));
    l[`q${i + 1}under`] = unpaid;
    l[`q${i + 1}pen`] = qPenalty;
    penalty += qPenalty;
  }
  l['19'] = penalty;
  if (penalty > 0) {
    warnings.push({
      level: 'info',
      message: `Estimated-tax penalty (Form 2210 regular method, equal installments) is $${penalty.toLocaleString()}. 2025 Form 2210 no longer prints a short method; all 2025–early-2026 quarters use the 7% underpayment rate.`,
    });
  }
  return { penalty, lines: l };
}
