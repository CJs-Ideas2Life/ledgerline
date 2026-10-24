// SPDX-License-Identifier: AGPL-3.0-or-later
import type { TaxResult } from '../types';
import { RULE_BY_ID } from './registry';
import type { TraceStep } from './types';

function step(
  form: string,
  line: string,
  label: string,
  amount: number,
  ruleIds: string[],
  note?: string,
): TraceStep {
  for (const id of ruleIds) {
    if (!RULE_BY_ID[id]) throw new Error(`Unknown rule id on trace: ${id}`);
  }
  return { form, line, label, amount, ruleIds, note };
}

/** Map a review-page form title / result key onto the registry form code. */
export function formKey(titleOrPath: string): string {
  const t = titleOrPath.toLowerCase();
  if (t.includes('1040') || t === 'form1040') return '1040';
  if (t.includes('1-a') || t.includes('1a') || t === 'schedule1a') return '1-A';
  if (t.includes('8812') || t === 'schedule8812') return '8812';
  if (t.includes('8995-a') || t.includes('8995a') || t === 'form8995a') return '8995-A';
  if (t.includes('8995') || t === 'form8995') return '8995';
  if (t.includes('6251') || t === 'form6251') return '6251';
  if (t.includes('4952') || t === 'form4952') return '4952';
  if (t.includes('2210') || t === 'form2210') return '2210';
  if (t.includes('8959') || t === 'form8959') return '8959';
  if (t.includes('8960') || t === 'form8960') return '8960';
  if (t.includes('qdcg') || t.includes('qualified dividends')) return '1040';
  if (t.includes('schedule a') || t === 'schedulea') return 'A';
  if (t.includes('schedule b') || t === 'scheduleb') return 'B';
  if (t.includes('schedule c') || t === 'schedulec') return 'C';
  if (t.includes('schedule se') || t === 'schedulese' || t === 'schedule se') return 'SE';
  if (t.includes('schedule d') || t === 'scheduled') return 'D';
  if (t.includes('schedule 1') || t === 'schedule1') return '1';
  if (t.includes('schedule 2') || t === 'schedule2') return '2';
  return titleOrPath;
}

/**
 * Record the rule ids behind every material line on this return.
 * Always emits one step per ENGINE_STEP_IDS entry so completeness can
 * prove the engine linked the step, even when the amount is zero.
 */
export function buildTrace(result: TaxResult): TraceStep[] {
  const F = result.form1040;
  const S1 = result.schedule1;
  const S1A = result.schedule1A;
  const A = result.scheduleA;
  const B = result.scheduleB;
  const D = result.scheduleD;
  const C = result.schedule8812;
  const Q = result.form8995;
  const QA = result.form8995A;
  const se = result.scheduleSE[0]?.lines ?? {};
  const schC = result.scheduleC[0]?.lines ?? {};
  const taxRule =
    result.taxMethod === 'qdcg-worksheet'
      ? 'qdcg-worksheet'
      : result.taxMethod === 'computation-worksheet'
        ? 'tax-computation-worksheet'
        : 'tax-table';

  const steps: TraceStep[] = [
    step('1040', 'round', 'Whole-dollar rounding policy', 0, ['round-whole-dollar'], 'IRS whole-dollar; cents only inside the Tax Computation Worksheet.'),
    step('1040', '1z', 'Wages', F['1z'] ?? 0, ['wages-1z', 'joint-vs-spouse-filter']),
    step('1040', '2a', 'Tax-exempt interest', F['2a'] ?? 0, ['interest-2ab']),
    step('1040', '2b', 'Taxable interest', F['2b'] ?? 0, ['interest-2ab', 'schedule-b']),
    step('1040', '3a', 'Qualified dividends', F['3a'] ?? 0, ['dividends-3ab']),
    step('1040', '3b', 'Ordinary dividends', F['3b'] ?? 0, ['dividends-3ab', 'schedule-b']),
    step('1040', '7a', 'Capital gain or (loss)', F['7a'] ?? 0, ['capgain-7', 'schedule-d', 'collectibles-not-28']),
    step('1040', '8', 'Additional income', F['8'] ?? 0, ['additional-income-8']),
    step('1040', '10', 'Adjustments to income', F['10'] ?? 0, ['adjustments-10']),
    step('1040', '11b', 'Adjusted gross income', F['11b'] ?? 0, ['agi-11']),
    step('1040', '12e', 'Standard or itemized deduction', F['12e'] ?? 0, [
      'std-deduction', 'additional-std', 'dependent-std-worksheet', 'mfs-spouse-itemizes', 'itemize-vs-standard',
    ]),
    step('1040', '13a', 'QBI deduction', F['13a'] ?? 0, ['qbi-8995', 'qbi-8995a-w2-ubia', 'qbi-sstb']),
    step('1040', '13b', 'Schedule 1-A deductions', F['13b'] ?? 0, ['s1a-tips', 's1a-overtime', 's1a-car-loan', 's1a-senior']),
    step('1040', '15', 'Taxable income', F['15'] ?? 0, ['taxable-income-15']),
    step('1040', '16', 'Tax', F['16'] ?? 0, [taxRule, 'brackets-ordinary', 'tax-table-limit', 'round-whole-dollar']),
    step('1040', '16-table', 'Tax Table method', result.taxMethod === 'table' ? F['16'] ?? 0 : 0, ['tax-table'], result.taxMethod === 'table' ? undefined : 'Not used: taxable income is $100,000 or more, or the QDCG worksheet applies.'),
    step('1040', '16-ws', 'Tax Computation Worksheet method', result.taxMethod === 'computation-worksheet' ? F['16'] ?? 0 : 0, ['tax-computation-worksheet'], result.taxMethod === 'computation-worksheet' ? undefined : 'Not used: taxable income is under $100,000 or the QDCG worksheet applies.'),
    step('1040', '17', 'AMT from Schedule 2', F['17'] ?? 0, ['amt-6251']),
    step('1040', '19', 'Child tax credit / ODC', F['19'] ?? 0, ['ctc-8812', 'ctc-amounts']),
    step('1040', '25d', 'Withholding', F['25d'] ?? 0, ['payments-33']),
    step('1040', '27a', 'Earned income credit', F['27a'] ?? 0, ['eic-32', 'eic-params', 'eic-investment-limit']),
    step('1040', '28', 'Additional child tax credit', F['28'] ?? 0, ['actc-8812']),
    step('1040', '33', 'Total payments', F['33'] ?? 0, ['payments-33']),
    step('1040', '35a', 'Refund', F['35a'] ?? 0, ['refund-or-owe']),
    step('1040', '37', 'Amount owed', F['37'] ?? 0, ['refund-or-owe']),
    step('1040', '38', 'Estimated-tax penalty', F['38'] ?? 0, ['form-2210']),
    step('1', '3', 'Business income', S1['3'] ?? 0, ['schedule-c', 'additional-income-8']),
    step('1', '15', 'Deductible half of SE tax', S1['15'] ?? 0, ['se-tax-schedule-se', 'se-tax']),
    step('1', '16', 'SEP / solo 401(k)', S1['16'] ?? 0, ['se-retirement']),
    step('1', '17', 'SE health insurance', S1['17'] ?? 0, ['se-health']),
    step('1-A', '13', 'Qualified tips', S1A['13'] ?? 0, ['s1a-tips']),
    step('1-A', '21', 'Qualified overtime', S1A['21'] ?? 0, ['s1a-overtime']),
    step('1-A', '30', 'Car-loan interest', S1A['30'] ?? 0, ['s1a-car-loan']),
    step('1-A', '37', 'Senior deduction', S1A['37'] ?? 0, ['s1a-senior', 'senior-deduction']),
    step('A', '4', 'Deductible medical', A['4'] ?? 0, ['medical-itemized', 'medical-agi-floor']),
    step('A', '5e', 'SALT after limit', A['5e'] ?? 0, ['salt-cap', 'salt-worksheet']),
    step('A', '8e', 'Mortgage interest', A['8e'] ?? 0, ['mortgage-debt-cap']),
    step('A', '9', 'Investment interest', A['9'] ?? 0, ['form-4952']),
    step('A', '14', 'Charitable gifts', A['14'] ?? 0, ['charity-agi-limits']),
    step('A', '17', 'Total itemized', A['17'] ?? 0, ['itemize-vs-standard']),
    step('B', '4', 'Taxable interest', B['4'] ?? 0, ['schedule-b', 'interest-2ab']),
    step('B', '6', 'Ordinary dividends', B['6'] ?? 0, ['schedule-b', 'dividends-3ab']),
    step('C', '24b', 'Deductible meals', schC['24b'] ?? 0, ['meals-50']),
    step('C', '31', 'Net profit', schC['31'] ?? 0, ['schedule-c', 'joint-vs-spouse-filter']),
    step('SE', '12', 'Self-employment tax', se['12'] ?? 0, ['se-tax-schedule-se', 'se-tax']),
    step('D', '16', 'Net gain or loss', D['16'] ?? 0, ['schedule-d', 'form-8949-term']),
    step('D', '21', 'Allowed gain or loss', D['21'] ?? 0, ['schedule-d', 'capgain-7']),
    step('8812', '14', 'Nonrefundable CTC / ODC', C['14'] ?? 0, ['ctc-8812', 'ctc-amounts']),
    step('8812', '27', 'Additional CTC', C['27'] ?? 0, ['actc-8812']),
    step('8995', '15', 'QBI deduction (Form 8995)', Q['15'] ?? 0, ['qbi-8995']),
    step('8995-A', '15', 'QBI deduction (Form 8995-A)', QA?.['15'] ?? 0, ['qbi-8995a-w2-ubia', 'qbi-sstb']),
    step('6251', '11', 'AMT', result.form6251['11'] ?? 0, ['amt-6251', 'amt-exemption']),
    step('4952', '8', 'Deductible investment interest', result.form4952['8'] ?? 0, ['form-4952']),
    step('2210', '19', 'Estimated-tax penalty', result.form2210['19'] ?? 0, ['form-2210']),
    step('8959', '18', 'Additional Medicare Tax', result.form8959['18'] ?? 0, ['additional-medicare']),
    step('8960', '17', 'NIIT', result.form8960['17'] ?? 0, ['niit']),
  ];

  if (result.qdcgWorksheet) {
    steps.push(step('1040', 'QDCG-25', 'QDCG worksheet tax', result.qdcgWorksheet['25'] ?? 0, ['qdcg-worksheet', 'cg-zero-rate', 'cg-fifteen-rate']));
  } else {
    steps.push(step('1040', 'QDCG-25', 'QDCG worksheet not used', 0, ['qdcg-worksheet', 'cg-zero-rate', 'cg-fifteen-rate'], 'No qualified dividends or preferential gain.'));
  }

  return steps;
}
