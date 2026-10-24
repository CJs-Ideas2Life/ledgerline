// SPDX-License-Identifier: AGPL-3.0-or-later
import { AMT, CG_FIFTEEN_RATE_MAX, CG_ZERO_RATE_MAX, type FilingStatus } from './constants2025';
import { dollars, pos } from './money';
import type { Lines, Warning } from './types';

function amtOrdinaryTax(taxableExcess: number, fs: FilingStatus): number {
  const cap = AMT.rate26Cap[fs];
  if (taxableExcess <= 0) return 0;
  if (taxableExcess <= cap) return dollars(taxableExcess * AMT.rate26);
  const extra = fs === 'mfs' ? 2_391 : 4_782;
  return dollars(taxableExcess * AMT.rate28 - extra);
}

/**
 * Form 6251 (2025) Parts I–III for the adjustments this engine supports:
 * senior-deduction addback (lines 1a–1b), SALT or standard deduction (line 2a),
 * medical 7.5%/10% difference (line 3), exemption, and the capital-gain Part III
 * when qualified dividends or preferential gain are present.
 */
export function form6251(opts: {
  fs: FilingStatus;
  agi: number;
  form1040Line14: number;
  seniorDeduction: number;
  usesItemized: boolean;
  scheduleATaxes: number;
  standardDeductionUsed: number;
  medicalDeducted: number;
  regularTaxLine16: number;
  qualifiedDividends: number;
  preferentialGain: number;
  taxableIncome: number;
  warnings: Warning[];
}): Lines {
  const {
    fs, agi, form1040Line14, seniorDeduction, usesItemized, scheduleATaxes,
    standardDeductionUsed, medicalDeducted, regularTaxLine16, qualifiedDividends,
    preferentialGain, taxableIncome, warnings,
  } = opts;
  const l: Lines = {};
  l['1a'] = form1040Line14 - seniorDeduction;
  l['1b'] = agi - l['1a'];
  l['2a'] = usesItemized ? scheduleATaxes : standardDeductionUsed;
  l['2b'] = 0;
  l['2c'] = 0;
  // Medical: AMT allows only the excess over 10% of AGI (§ 56(b)(1)(B)).
  const amtMedical = pos(medicalDeducted + dollars(pos(agi) * 0.075) - dollars(pos(agi) * AMT.medicalFloor));
  // medicalDeducted is the regular-tax amount (expenses − 7.5% AGI).
  // AMT-allowed = pos(expenses − 10% AGI) = pos(medicalDeducted + 7.5%AGI − 10%AGI).
  l['3'] = pos(medicalDeducted - amtMedical);
  l['4'] = l['1b'] + l['2a'] - l['2b'] + l['2c'] + l['3'];
  if (fs === 'mfs' && l['4'] > AMT.mfsExtraStart) {
    const extra = l['4'] >= AMT.phaseOutComplete.mfs ? AMT.exemption.mfs : dollars((l['4'] - AMT.mfsExtraStart) * AMT.phaseOutRate);
    l['4'] += extra;
  }
  const complete = AMT.phaseOutComplete[fs];
  if (l['4'] >= complete) {
    l['5'] = 0;
  } else if (l['4'] <= AMT.phaseOutStart[fs]) {
    l['5'] = AMT.exemption[fs];
  } else {
    l['5'] = pos(AMT.exemption[fs] - dollars((l['4'] - AMT.phaseOutStart[fs]) * AMT.phaseOutRate));
  }
  l['6'] = pos(l['4'] - l['5']);

  const pref = pos(qualifiedDividends + preferentialGain);
  if (pref > 0 && l['6'] > 0) {
    // Part III — Tax Computation Using Maximum Capital Gains Rates
    l['12'] = l['6'];
    l['13'] = pref;
    l['14'] = 0; // unrecaptured 1250 not computed
    l['15'] = l['13'];
    l['16'] = Math.min(l['12'], l['15']);
    l['17'] = l['12'] - l['16'];
    l['18'] = amtOrdinaryTax(l['17'], fs);
    l['19'] = CG_ZERO_RATE_MAX[fs];
    l['20'] = pos(taxableIncome - pref); // QDCG worksheet line 5
    l['21'] = pos(l['19'] - l['20']);
    l['22'] = Math.min(l['12'], l['13']);
    l['23'] = Math.min(l['21'], l['22']);
    l['24'] = l['22'] - l['23'];
    l['25'] = CG_FIFTEEN_RATE_MAX[fs];
    l['26'] = l['21'];
    l['27'] = l['20'];
    l['28'] = l['26'] + l['27'];
    l['29'] = pos(l['25'] - l['28']);
    l['30'] = Math.min(l['24'], l['29']);
    l['31'] = dollars(l['30'] * 0.15);
    l['32'] = l['23'] + l['30'];
    l['33'] = pos(l['22'] - l['32']);
    l['34'] = dollars(l['33'] * 0.2);
    l['35'] = 0;
    l['36'] = 0;
    l['37'] = 0;
    l['38'] = l['18'] + l['31'] + l['34'] + l['37'];
    l['39'] = amtOrdinaryTax(l['12'], fs);
    l['40'] = Math.min(l['38'], l['39']);
    l['7'] = l['40'];
  } else {
    l['7'] = amtOrdinaryTax(l['6'], fs);
  }
  l['8'] = 0;
  l['9'] = l['7'] - l['8'];
  l['10'] = pos(regularTaxLine16);
  l['11'] = pos(l['9'] - l['10']);
  if (l['11'] > 0) {
    warnings.push({
      level: 'info',
      message: `Alternative minimum tax of $${l['11'].toLocaleString()} applies (Form 6251). Preference items other than the senior-deduction addback, SALT / standard deduction, and the medical 10% floor are not computed.`,
    });
  }
  return l;
}
