// SPDX-License-Identifier: AGPL-3.0-or-later
import { RETIREMENT } from './constants2025';
import { amt, dollars, pos } from './money';
import type { Business, Owner, Person, ScheduleCResult, ScheduleSEResult, Warning } from './types';

export interface SeAdjustment {
  owner: Owner;
  health: number;
  employer: number;
  elective: number;
  total: number;
}

/**
 * Self-employed health insurance (Sch. 1 line 17) and SEP / solo 401(k) (Sch. 1 line 16).
 * Order: ½ SE tax, then employer contribution (20% of remaining net, $70,000 − elective),
 * then health insurance (remaining net profit). Pub. 535 / Pub. 560.
 */
export function seAdjustments(
  businesses: Business[],
  scheduleCs: ScheduleCResult[],
  ses: ScheduleSEResult[],
  taxpayer: Person,
  spouse: Person,
  coveredByEmployerPlan: boolean,
  warnings: Warning[],
): SeAdjustment[] {
  const out: SeAdjustment[] = [];
  const owners: Owner[] = ['taxpayer', 'spouse'];
  for (const owner of owners) {
    const mine = scheduleCs.filter((c) => c.owner === owner);
    if (!mine.length) continue;
    const se = ses.find((s) => s.owner === owner);
    const seDeduction = se?.lines['13'] ?? 0;
    const netProfit = mine.reduce((s, c) => s + c.lines['31'], 0);
    if (netProfit <= 0) {
      out.push({ owner, health: 0, employer: 0, elective: 0, total: 0 });
      continue;
    }
    const person = owner === 'spouse' ? spouse : taxpayer;
    const bizInputs = businesses.filter((b) => b.owner === owner);
    const requestedElective = sum(bizInputs.map((b) => amt(b.solo401kElective)));
    const requestedEmployer = sum(bizInputs.map((b) => amt(b.sepOrSoloEmployer)));
    const requestedHealth = coveredByEmployerPlan ? 0 : sum(bizInputs.map((b) => amt(b.seHealthInsurance)));

    const electiveCap = RETIREMENT.electiveDeferral + (person.age50OrOver === true ? RETIREMENT.catchUp50 : 0);
    const elective = Math.min(requestedElective, electiveCap, pos(netProfit - seDeduction));

    const compBase = pos(netProfit - seDeduction);
    const employerBase = dollars(Math.min(compBase, RETIREMENT.compensationCap) * RETIREMENT.solePropEmployerRate);
    const employerCap = pos(Math.min(employerBase, RETIREMENT.definedContributionLimit - elective));
    const employer = Math.min(requestedEmployer, employerCap);

    const healthCap = pos(netProfit - seDeduction - employer - elective);
    const health = Math.min(requestedHealth, healthCap);

    if (requestedElective > elective || requestedEmployer > employer) {
      warnings.push({
        level: 'info',
        message: `${owner === 'spouse' ? 'Spouse' : 'Your'} SEP / solo 401(k) contribution was capped at the 2025 limit (Notice 2024-80: elective $${electiveCap.toLocaleString()} + employer 20% of net SE, combined $${RETIREMENT.definedContributionLimit.toLocaleString()}).`,
      });
    }
    if (requestedHealth > health && !coveredByEmployerPlan) {
      warnings.push({
        level: 'info',
        message: `${owner === 'spouse' ? 'Spouse' : 'Your'} self-employed health insurance deduction is limited to net profit after the deductible part of SE tax and retirement contributions (Pub. 535).`,
      });
    }
    if (coveredByEmployerPlan && requestedHealth > 0) {
      warnings.push({
        level: 'info',
        message: 'Self-employed health insurance is not deductible if you were eligible for an employer-sponsored health plan (Pub. 535).',
      });
    }
    out.push({ owner, health, employer, elective, total: health + employer + elective });
  }
  return out;
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}
