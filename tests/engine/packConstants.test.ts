import { describe, expect, it } from 'vitest';
import {
  ADDITIONAL_MEDICARE,
  ADDITIONAL_STD_DEDUCTION_MARRIED,
  ADDITIONAL_STD_DEDUCTION_UNMARRIED,
  ADOPTION_CREDIT,
  AMT,
  BRACKETS,
  CAPITAL_LOSS_LIMIT,
  CAPITAL_LOSS_LIMIT_MFS,
  CAR_LOAN_INTEREST,
  CG_FIFTEEN_RATE_MAX,
  CG_ZERO_RATE_MAX,
  CTC,
  DEPENDENT_STD_DEDUCTION_EARNED_ADDON,
  DEPENDENT_STD_DEDUCTION_MIN,
  EIC,
  ESTIMATED_TAX,
  KIDDIE_TAX,
  MEDICAL_AGI_FLOOR,
  MILEAGE,
  MORTGAGE_DEBT_LIMIT,
  MORTGAGE_DEBT_LIMIT_MFS,
  NIIT,
  OVERTIME_DEDUCTION,
  QBI,
  QUALIFYING_RELATIVE_GROSS_INCOME,
  RETIREMENT,
  ROTH_CONTRIBUTION_PHASEOUT,
  SALT,
  SE,
  SECTION_179,
  SENIOR_DEDUCTION,
  STANDARD_DEDUCTION,
  TIPS_DEDUCTION,
} from '../../src/engine/constants2025';
import {
  ANNUAL_RULE_PACK_KEY,
  PARTIAL_PACK_KEYS,
  RULES,
  TY2025_PARAMETERS,
  UNVERIFIED_PACK_KEYS,
  packParam,
} from '../../src/engine/rules';

const bounds = (status: keyof typeof BRACKETS) =>
  BRACKETS[status].map((b) => (b.upTo === Infinity ? null : b.upTo));

describe('engine constants equal ty2025-parameters.json', () => {
  it('pack has 84 annual parameters, all verified', () => {
    expect(Object.keys(TY2025_PARAMETERS)).toHaveLength(84);
    expect(Object.values(TY2025_PARAMETERS).every((p) => p.verified === true)).toBe(true);
  });

  const checks: [string, unknown, unknown][] = [
    ['brackets.single.upper_bounds', bounds('single'), (packParam('brackets.single').value as { upper_bounds: unknown }).upper_bounds],
    ['brackets.mfj_qss.upper_bounds', bounds('mfj'), (packParam('brackets.mfj_qss').value as { upper_bounds: unknown }).upper_bounds],
    ['brackets.qss mirrors mfj', bounds('qss'), (packParam('brackets.mfj_qss').value as { upper_bounds: unknown }).upper_bounds],
    ['brackets.mfs.upper_bounds', bounds('mfs'), (packParam('brackets.mfs').value as { upper_bounds: unknown }).upper_bounds],
    ['brackets.hoh.upper_bounds', bounds('hoh'), (packParam('brackets.hoh').value as { upper_bounds: unknown }).upper_bounds],
    ['standard_deduction.basic', STANDARD_DEDUCTION, packParam('standard_deduction.basic').value],
    ['additional aged/blind married', ADDITIONAL_STD_DEDUCTION_MARRIED, (packParam('standard_deduction.additional_aged_blind').value as { married_or_qss: number }).married_or_qss],
    ['additional aged/blind unmarried', ADDITIONAL_STD_DEDUCTION_UNMARRIED, (packParam('standard_deduction.additional_aged_blind').value as { unmarried_not_qss: number }).unmarried_not_qss],
    ['dependent min', DEPENDENT_STD_DEDUCTION_MIN, (packParam('standard_deduction.dependent').value as { minimum: number }).minimum],
    ['dependent addon', DEPENDENT_STD_DEDUCTION_EARNED_ADDON, (packParam('standard_deduction.dependent').value as { earned_income_plus: number }).earned_income_plus],
    ['cg 0% single', CG_ZERO_RATE_MAX.single, (packParam('capital_gains.single').value as { zero_rate_max: number }).zero_rate_max],
    ['cg 0% mfj', CG_ZERO_RATE_MAX.mfj, (packParam('capital_gains.mfj_qss').value as { zero_rate_max: number }).zero_rate_max],
    ['cg 0% hoh', CG_ZERO_RATE_MAX.hoh, (packParam('capital_gains.hoh').value as { zero_rate_max: number }).zero_rate_max],
    ['cg 15% single', CG_FIFTEEN_RATE_MAX.single, (packParam('capital_gains.single').value as { fifteen_rate_max: number }).fifteen_rate_max],
    ['cg 15% mfs', CG_FIFTEEN_RATE_MAX.mfs, (packParam('capital_gains.mfs').value as { fifteen_rate_max: number }).fifteen_rate_max],
    ['cg 15% mfj', CG_FIFTEEN_RATE_MAX.mfj, (packParam('capital_gains.mfj_qss').value as { fifteen_rate_max: number }).fifteen_rate_max],
    ['cg 15% hoh', CG_FIFTEEN_RATE_MAX.hoh, (packParam('capital_gains.hoh').value as { fifteen_rate_max: number }).fifteen_rate_max],
    ['medical floor', MEDICAL_AGI_FLOOR, packParam('schedule_a.medical_floor_pct').value],
    ['salt cap', SALT.baseCap, (packParam('salt.cap').value as { cap: number }).cap],
    ['salt mfs cap', SALT.mfsCap, (packParam('salt.cap').value as { cap_mfs: number }).cap_mfs],
    ['salt threshold', SALT.phaseDownStart, (packParam('salt.cap').value as { magi_threshold: number }).magi_threshold],
    ['salt threshold mfs', SALT.phaseDownStartMfs, (packParam('salt.cap').value as { magi_threshold_mfs: number }).magi_threshold_mfs],
    ['salt rate', SALT.phaseDownRate, (packParam('salt.cap').value as { phasedown_rate: number }).phasedown_rate],
    ['salt floor', SALT.floor, (packParam('salt.cap').value as { floor: number }).floor],
    ['salt floor mfs', SALT.floorMfs, (packParam('salt.cap').value as { floor_mfs: number }).floor_mfs],
    ['ctc per child', CTC.perChild, packParam('ctc.per_child').value],
    ['odc', CTC.perOtherDependent, packParam('odc.per_dependent').value],
    ['ctc phaseout mfj', CTC.phaseOutStartMfj, (packParam('ctc.phaseout_threshold').value as { mfj: number }).mfj],
    ['ctc phaseout other', CTC.phaseOutStartOther, (packParam('ctc.phaseout_threshold').value as { other: number }).other],
    ['ctc per 1000 or fraction', CTC.phaseOutPer1000, (packParam('ctc.phaseout_threshold').value as { reduction_per_1000_or_fraction: number }).reduction_per_1000_or_fraction],
    ['actc', CTC.refundablePerChild, packParam('ctc.refundable_max_per_child').value],
    ['ctc ei floor', CTC.earnedIncomeFloor, (packParam('ctc.earned_income_threshold_and_rate').value as { threshold: number }).threshold],
    ['ctc ei rate', CTC.earnedIncomeRate, (packParam('ctc.earned_income_threshold_and_rate').value as { rate: number }).rate],
    ['ss wage base', SE.ssWageBase, packParam('social_security.wage_base').value],
    ['se factor', SE.netEarningsFactor, (packParam('self_employment.rates').value as { net_earnings_factor: number }).net_earnings_factor],
    ['se min', SE.minimumNetEarnings, (packParam('self_employment.rates').value as { min_net_earnings: number }).min_net_earnings],
    ['addl medicare qss', ADDITIONAL_MEDICARE.threshold.qss, (packParam('additional_medicare.threshold').value as { single_hoh_qss: number }).single_hoh_qss],
    ['addl medicare mfj', ADDITIONAL_MEDICARE.threshold.mfj, (packParam('additional_medicare.threshold').value as { mfj: number }).mfj],
    ['niit qss', NIIT.threshold.qss, (packParam('niit.threshold').value as { mfj_qss: number }).mfj_qss],
    ['niit single', NIIT.threshold.single, (packParam('niit.threshold').value as { single_hoh: number }).single_hoh],
    ['qbi mfj', QBI.threshold.mfj, (packParam('qbi.threshold').value as { mfj: number }).mfj],
    ['qbi other', QBI.threshold.single, (packParam('qbi.threshold').value as { other: number }).other],
    ['qbi range mfj', QBI.phaseInRange.mfj, (packParam('qbi.phase_in_range').value as { mfj: number }).mfj],
    ['qbi range other', QBI.phaseInRange.single, (packParam('qbi.phase_in_range').value as { other: number }).other],
    ['qbi 2026 minimum is not 2025', null, packParam('qbi.minimum_deduction').value],
    ['senior amount', SENIOR_DEDUCTION.amount, (packParam('obbba.senior_deduction').value as { per_qualified_individual: number }).per_qualified_individual],
    ['senior rate', SENIOR_DEDUCTION.phaseOutRate, (packParam('obbba.senior_deduction').value as { phaseout_rate: number }).phaseout_rate],
    ['amt mfs exemption', AMT.exemption.mfs, (packParam('amt.exemption').value as { mfs: number }).mfs],
    ['amt mfj exemption', AMT.exemption.mfj, (packParam('amt.exemption').value as { mfj_qss: number }).mfj_qss],
    ['eic max 0', EIC.maxCredit[0], (packParam('eic.children_0').value as { max_credit: number }).max_credit],
    ['eic max 1', EIC.maxCredit[1], (packParam('eic.children_1').value as { max_credit: number }).max_credit],
    ['eic max 2', EIC.maxCredit[2], (packParam('eic.children_2').value as { max_credit: number }).max_credit],
    ['eic max 3', EIC.maxCredit[3], (packParam('eic.children_3plus').value as { max_credit: number }).max_credit],
    ['eic invest', EIC.investmentIncomeLimit, packParam('eic.investment_income_limit').value],
    ['tips cap', TIPS_DEDUCTION.cap, (packParam('obbba.tips').value as { cap: number }).cap],
    ['ot cap', OVERTIME_DEDUCTION.cap, (packParam('obbba.overtime').value as { cap: number }).cap],
    ['ot cap mfj', OVERTIME_DEDUCTION.capMfj, (packParam('obbba.overtime').value as { cap_mfj: number }).cap_mfj],
    ['car cap', CAR_LOAN_INTEREST.cap, (packParam('obbba.car_loan_interest').value as { cap: number }).cap],
    ['mortgage', MORTGAGE_DEBT_LIMIT, (packParam('schedule_a.mortgage_debt_limit').value as { general: number }).general],
    ['mortgage mfs', MORTGAGE_DEBT_LIMIT_MFS, (packParam('schedule_a.mortgage_debt_limit').value as { mfs: number }).mfs],
    ['cap loss', CAPITAL_LOSS_LIMIT, (packParam('capital_loss_limit').value as { general: number }).general],
    ['cap loss mfs', CAPITAL_LOSS_LIMIT_MFS, (packParam('capital_loss_limit').value as { mfs: number }).mfs],
    ['401k', RETIREMENT.electiveDeferral, packParam('retirement.401k_elective_deferral').value],
    ['415c', RETIREMENT.definedContributionLimit, packParam('retirement.415c_dc_limit').value],
    ['comp cap', RETIREMENT.compensationCap, packParam('retirement.401a17_comp_limit').value],
    ['est 90%', ESTIMATED_TAX.currentYearPct, (packParam('estimated_tax.safe_harbors').value as { current_year_pct: number }).current_year_pct],
    ['section 179', SECTION_179.limit, (packParam('section179').value as { limit: number }).limit],
    ['section 179 phaseout', SECTION_179.phaseoutStart, (packParam('section179').value as { phaseout_start: number }).phaseout_start],
    ['roth single top', ROTH_CONTRIBUTION_PHASEOUT.singleEnd, (packParam('roth.contribution_phaseout').value as { single_hoh: number[] }).single_hoh[1]],
    ['kiddie unit', KIDDIE_TAX.unit, packParam('kiddie_tax.unearned_income_threshold_unit').value],
    ['kiddie Form 8615 threshold', KIDDIE_TAX.form8615Threshold, packParam('kiddie_tax.form8615_threshold').value],
    ['adoption max', ADOPTION_CREDIT.max, (packParam('adoption_credit').value as { max: number }).max],
    ['adoption refundable', ADOPTION_CREDIT.refundableMax, (packParam('adoption_credit').value as { refundable_portion_max: number }).refundable_portion_max],
    ['qualifying relative', QUALIFYING_RELATIVE_GROSS_INCOME, packParam('qualifying_relative_gross_income').value],
    ['mileage business', MILEAGE.businessCents, (packParam('mileage').value as { business_cents: number }).business_cents],
  ];

  it.each(checks)('%s', (_name, got, want) => {
    expect(got).toEqual(want);
  });

  it('does not use the superseded Rev. Proc. standard deduction or §179 figures', () => {
    const oldSd = packParam('standard_deduction.rev_proc_2024_40_superseded').value as { single: number; mfj: number; hoh: number };
    expect(STANDARD_DEDUCTION.single).not.toBe(oldSd.single);
    expect(STANDARD_DEDUCTION.mfj).not.toBe(oldSd.mfj);
    expect(STANDARD_DEDUCTION.hoh).not.toBe(oldSd.hoh);
    const old179 = packParam('section179_rev_proc_superseded').value as { limit: number };
    expect(SECTION_179.limit).not.toBe(old179.limit);
  });

  it('AMT MFS exemption is $68,500 not the IR-2024-273 $68,650', () => {
    expect(AMT.exemption.mfs).toBe(68_500);
  });
});

describe('annual registry entries carry pack metadata', () => {
  it('every mapped annual rule has sourceUrl, indexing, sunset, and a verified flag', () => {
    for (const [id, key] of Object.entries(ANNUAL_RULE_PACK_KEY)) {
      const r = RULES.find((x) => x.id === id);
      expect(r, id).toBeTruthy();
      expect(r!.parameterKey, id).toBe(key);
      expect(r!.sourceUrl, id).toMatch(/^https?:\/\//);
      expect(r!.indexing, id).toBeTruthy();
      expect(r!.sunset, id).toBeTruthy();
      expect([true, false, 'partial']).toContain(r!.verified);
    }
  });

  it('has no UNVERIFIED or partial pack keys after the close-out pass', () => {
    expect(UNVERIFIED_PACK_KEYS).toEqual([]);
    expect(PARTIAL_PACK_KEYS).toEqual([]);
    expect(RULES.filter((r) => r.verified === false || r.verified === 'partial')).toEqual([]);
  });
});
