// SPDX-License-Identifier: AGPL-3.0-or-later
import { CAR_LOAN_INTEREST, OVERTIME_DEDUCTION, SENIOR_DEDUCTION, TIPS_DEDUCTION } from './constants2025';
import { is65OrOver } from './eligibility';
import { amt, dollars, pos } from './money';
import type { Lines, TaxReturnInput, Warning } from './types';

function floorThousands(excess: number): number {
  return Math.floor(pos(excess) / 1000);
}

function ceilThousands(excess: number): number {
  if (excess <= 0) return 0;
  return Math.ceil(excess / 1000);
}

/**
 * Schedule 1-A (2025): MAGI, qualified tips, qualified overtime, car-loan interest,
 * enhanced senior deduction. Line 38 flows to Form 1040 line 13b.
 */
export function schedule1A(
  input: TaxReturnInput,
  agi: number,
  qualifiedTips: number,
  qualifiedOvertime: number,
  warnings: Warning[],
): Lines {
  const fs = input.filingStatus;
  const joint = fs === 'mfj';
  const l: Lines = {};
  l['1'] = agi;
  l['2e'] = 0;
  l['3'] = l['1'] + l['2e'];
  const magi = l['3'];
  const marriedNotJoint = fs === 'mfs';
  const tpOk = input.taxpayer.hasValidSSN === true;
  const spOk = joint && input.spouse.hasValidSSN === true;
  const ssnOk = joint ? tpOk || spOk : tpOk;

  // Part II — qualified tips. Married must file jointly; valid SSN required.
  if (marriedNotJoint && qualifiedTips > 0) {
    warnings.push({ level: 'info', message: 'The qualified-tips deduction requires a joint return if married.' });
  }
  if (qualifiedTips > 0 && !ssnOk) {
    warnings.push({ level: 'info', message: 'The qualified-tips deduction requires a Social Security number valid for employment.' });
  }
  const tipsEligible = !marriedNotJoint && ssnOk;
  l['6'] = tipsEligible ? amt(qualifiedTips) : 0;
  l['7'] = Math.min(l['6'], TIPS_DEDUCTION.cap);
  l['8'] = magi;
  l['9'] = joint ? TIPS_DEDUCTION.phaseOutStartMfj : TIPS_DEDUCTION.phaseOutStart;
  l['10'] = pos(l['8'] - l['9']);
  if (l['10'] <= 0) {
    l['11'] = 0;
    l['12'] = 0;
    l['13'] = l['7'];
  } else {
    l['11'] = floorThousands(l['10']);
    l['12'] = l['11'] * TIPS_DEDUCTION.reductionPerThousand;
    l['13'] = pos(l['7'] - l['12']);
  }

  // Part III — qualified overtime.
  if (marriedNotJoint && qualifiedOvertime > 0) {
    warnings.push({ level: 'info', message: 'The qualified-overtime deduction requires a joint return if married.' });
  }
  if (qualifiedOvertime > 0 && !ssnOk) {
    warnings.push({ level: 'info', message: 'The qualified-overtime deduction requires a Social Security number valid for employment.' });
  }
  const otEligible = !marriedNotJoint && ssnOk;
  l['14c'] = otEligible ? amt(qualifiedOvertime) : 0;
  l['15'] = Math.min(l['14c'], joint ? OVERTIME_DEDUCTION.capMfj : OVERTIME_DEDUCTION.cap);
  l['16'] = magi;
  l['17'] = joint ? OVERTIME_DEDUCTION.phaseOutStartMfj : OVERTIME_DEDUCTION.phaseOutStart;
  l['18'] = pos(l['16'] - l['17']);
  if (l['18'] <= 0) {
    l['19'] = 0;
    l['20'] = 0;
    l['21'] = l['15'];
  } else {
    l['19'] = floorThousands(l['18']);
    l['20'] = l['19'] * OVERTIME_DEDUCTION.reductionPerThousand;
    l['21'] = pos(l['15'] - l['20']);
  }

  // Part IV — qualified passenger-vehicle loan interest. Available to MFS.
  l['23'] = amt(input.carLoanInterest);
  l['24'] = Math.min(l['23'], CAR_LOAN_INTEREST.cap);
  l['25'] = magi;
  l['26'] = joint ? CAR_LOAN_INTEREST.phaseOutStartMfj : CAR_LOAN_INTEREST.phaseOutStart;
  l['27'] = pos(l['25'] - l['26']);
  if (l['27'] <= 0) {
    l['28'] = 0;
    l['29'] = 0;
    l['30'] = l['24'];
  } else {
    l['28'] = ceilThousands(l['27']);
    l['29'] = l['28'] * CAR_LOAN_INTEREST.reductionPerThousand;
    l['30'] = pos(l['24'] - l['29']);
  }

  // Part V — enhanced deduction for seniors (existing logic).
  if (fs !== 'mfs') {
    l['31'] = magi;
    l['32'] = joint ? SENIOR_DEDUCTION.phaseOutStartMfj : SENIOR_DEDUCTION.phaseOutStart;
    l['33'] = pos(l['31'] - l['32']);
    l['34'] = dollars(l['33'] * SENIOR_DEDUCTION.phaseOutRate);
    l['35'] = l['33'] > 0 ? pos(SENIOR_DEDUCTION.amount - l['34']) : SENIOR_DEDUCTION.amount;
    l['36a'] = is65OrOver(input.taxpayer) === true && input.taxpayer.hasValidSSN === true ? l['35'] : 0;
    l['36b'] = joint && is65OrOver(input.spouse) === true && input.spouse.hasValidSSN === true ? l['35'] : 0;
    l['37'] = l['36a'] + l['36b'];
  } else {
    l['37'] = 0;
    if (is65OrOver(input.taxpayer) === true)
      warnings.push({ level: 'info', message: 'The enhanced deduction for seniors requires a joint return if married.' });
  }

  l['38'] = l['13'] + l['21'] + l['30'] + l['37'];
  return l;
}
