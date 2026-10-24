// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  ADDITIONAL_MEDICARE,
  ADDITIONAL_STD_DEDUCTION_MARRIED,
  ADDITIONAL_STD_DEDUCTION_UNMARRIED,
  CTC,
  DEPENDENT_STD_DEDUCTION_EARNED_ADDON,
  DEPENDENT_STD_DEDUCTION_MIN,
  MEALS_DEDUCTIBLE_SHARE,
  MEDICAL_AGI_FLOOR,
  NIIT,
  SALT,
  SCHEDULE_B_THRESHOLD,
  SE,
  STANDARD_DEDUCTION,
  TAX_TABLE_LIMIT,
  type FilingStatus,
} from './constants2025';
import { form6251 } from './amt';
import { creditEligibility, is65OrOver } from './eligibility';
import { eicInvestmentIncome, earnedIncomeCredit } from './eic';
import { form2210 } from './form2210';
import { applyCharityLimits, form4952, limitedMortgageInterest } from './itemizedLimits';
import { buildTrace } from './rules/trace';
import { amt, dollars, pos, sum } from './money';
import { computeQbi } from './qbi';
import { schedule1A } from './schedule1A';
import { scheduleD, scheduleDRequired } from './scheduleD';
import { seAdjustments } from './seAdjustments';
import { marginalRate, qdcgWorksheet, regularTax } from './taxComputation';
import { buildScope } from './validate';
import type {
  Business,
  ComponentPreview,
  Lines,
  Owner,
  ScheduleCResult,
  ScheduleSEResult,
  TaxResult,
  TaxReturnInput,
  Warning,
} from './types';

const isJoint = (s: FilingStatus) => s === 'mfj';

export function scheduleC(b: Business): Lines {
  const l: Lines = {};
  l['1'] = amt(b.grossReceipts);
  l['2'] = amt(b.returnsAllowances);
  l['3'] = l['1'] - l['2'];
  if (b.hasInventory) {
    l['35'] = amt(b.cogs.beginningInventory);
    l['36'] = amt(b.cogs.purchases);
    l['37'] = amt(b.cogs.costOfLabor);
    l['38'] = amt(b.cogs.materialsSupplies);
    l['39'] = amt(b.cogs.otherCosts);
    l['40'] = l['35'] + l['36'] + l['37'] + l['38'] + l['39'];
    l['41'] = amt(b.cogs.endingInventory);
    l['42'] = l['40'] - l['41'];
  } else {
    l['42'] = 0;
  }
  l['4'] = l['42'];
  l['5'] = l['3'] - l['4'];
  l['6'] = amt(b.otherIncome);
  l['7'] = l['5'] + l['6'];
  const e = b.expenses;
  l['8'] = amt(e.advertising);
  l['9'] = amt(e.carTruck);
  l['10'] = amt(e.commissionsFees);
  l['11'] = amt(e.contractLabor);
  l['12'] = amt(e.depletion);
  l['13'] = amt(e.depreciation);
  l['14'] = amt(e.employeeBenefits);
  l['15'] = amt(e.insurance);
  l['16a'] = amt(e.mortgageInterest);
  l['16b'] = amt(e.otherInterest);
  l['17'] = amt(e.legalProfessional);
  l['18'] = amt(e.officeExpense);
  l['19'] = amt(e.pensionProfitSharing);
  l['20a'] = amt(e.rentVehicles);
  l['20b'] = amt(e.rentOther);
  l['21'] = amt(e.repairs);
  l['22'] = amt(e.supplies);
  l['23'] = amt(e.taxesLicenses);
  l['24a'] = amt(e.travel);
  l['24b'] = dollars(amt(e.mealsTotal) * MEALS_DEDUCTIBLE_SHARE);
  l['25'] = amt(e.utilities);
  l['26'] = amt(e.wages);
  l['27a'] = 0;
  l['27b'] = amt(e.otherExpenses);
  l['28'] = sum(
    ['8', '9', '10', '11', '12', '13', '14', '15', '16a', '16b', '17', '18', '19', '20a', '20b', '21', '22', '23', '24a', '24b', '25', '26', '27a', '27b'].map(
      (k) => l[k],
    ),
  );
  l['29'] = l['7'] - l['28'];
  l['30'] = amt(b.homeOffice);
  l['31'] = l['29'] - l['30'];
  return l;
}

function scheduleSE(netProfit: number, ssWages: number): Lines {
  const l: Lines = {};
  l['2'] = netProfit;
  l['3'] = l['2'];
  l['4a'] = l['3'] > 0 ? dollars(l['3'] * SE.netEarningsFactor) : l['3'];
  l['4c'] = l['4a'];
  if (l['4c'] < SE.minimumNetEarnings) {
    l['6'] = 0;
    l['12'] = 0;
    l['13'] = 0;
    return l;
  }
  l['6'] = l['4c'];
  l['7'] = SE.ssWageBase;
  l['8a'] = ssWages;
  l['8d'] = ssWages;
  l['9'] = pos(l['7'] - l['8d']);
  l['10'] = dollars(Math.min(l['6'], l['9']) * SE.ssRate);
  l['11'] = dollars(l['6'] * SE.medicareRate);
  l['12'] = l['10'] + l['11'];
  l['13'] = dollars(l['12'] * SE.deductionShare);
  return l;
}

export function computeReturn(input: TaxReturnInput): TaxResult {
  const fs = input.filingStatus;
  const warnings: Warning[] = [];
  const joint = isJoint(fs);
  const owners: Owner[] = joint ? ['taxpayer', 'spouse'] : ['taxpayer'];
  // Ignore spouse-owned items unless filing jointly.
  const w2s = input.w2s.filter((w) => joint || w.owner === 'taxpayer');
  const businesses = input.businesses.filter((b) => joint || b.owner === 'taxpayer');
  if (w2s.length !== input.w2s.length || businesses.length !== input.businesses.length)
    warnings.push({ level: 'warn', message: 'Spouse-owned W-2s or businesses are ignored unless filing jointly.' });

  // ---------- Schedule B ----------
  const B: Lines = {};
  B['1'] = sum(input.interest.map((i) => amt(i.taxable)));
  B['2'] = B['1'];
  B['3'] = 0;
  B['4'] = B['2'] - B['3'];
  B['5'] = sum(input.dividends.map((d) => amt(d.ordinary)));
  B['6'] = B['5'];
  B['7a'] = input.foreignAccount ? 1 : 0;
  B['8'] = input.foreignTrust ? 1 : 0;
  const taxExemptInterest = sum(input.interest.map((i) => amt(i.taxExempt)));
  const qualifiedDividends = sum(input.dividends.map((d) => amt(d.qualified)));
  const capGainDistributions = sum(input.dividends.map((d) => amt(d.capitalGainDistributions)));
  if (qualifiedDividends > B['6'])
    warnings.push({ level: 'warn', message: 'Qualified dividends exceed ordinary dividends — check 1099-DIV boxes 1a/1b.' });
  input.dividends.forEach((d) => {
    if (amt(d.qualified) > amt(d.ordinary))
      warnings.push({ level: 'warn', message: `${d.payer || 'A 1099-DIV'}: qualified dividends (1b) exceed ordinary dividends (1a).` });
  });
  if (B['4'] > SCHEDULE_B_THRESHOLD || B['6'] > SCHEDULE_B_THRESHOLD || input.foreignAccount || input.foreignTrust)
    warnings.push({ level: 'info', message: 'Schedule B is required (interest or ordinary dividends over $1,500, or foreign account/trust).' });
  if (input.foreignAccount)
    warnings.push({ level: 'unsupported', message: 'Foreign financial account: FinCEN 114 (FBAR) and possibly Form 8938 may be required; not prepared here.' });

  // ---------- Schedule C / SE ----------
  const scheduleCs: ScheduleCResult[] = businesses.map((b) => ({ id: b.id, name: b.name, owner: b.owner, lines: scheduleC(b) }));
  scheduleCs.forEach((c) => {
    if (c.lines['31'] < 0)
      warnings.push({ level: 'info', message: `${c.name || 'Business'}: net loss. Assumes all investment is at risk (Sch. C line 32a) and no excess business loss limit (Form 461).` });
  });
  const ses: ScheduleSEResult[] = [];
  for (const o of owners) {
    const mine = scheduleCs.filter((c) => c.owner === o);
    if (!mine.length) continue;
    const net = sum(mine.map((c) => c.lines['31']));
    const ssWages = sum(w2s.filter((w) => w.owner === o).map((w) => amt(w.socialSecurityWages)));
    const lines = scheduleSE(net, ssWages);
    ses.push({ owner: o, lines });
  }
  const seTax = sum(ses.map((s) => s.lines['12']));
  const seDeduction = sum(ses.map((s) => s.lines['13']));
  const seAdj = seAdjustments(businesses, scheduleCs, ses, input.taxpayer, input.spouse, input.coveredByEmployerHealthPlan, warnings);
  const seHealth = sum(seAdj.map((a) => a.health));
  const seRetirement = sum(seAdj.map((a) => a.employer + a.elective));

  // ---------- Schedule D / Form 8949 ----------
  const dRes = scheduleD(input, capGainDistributions, warnings);
  const D = dRes.lines;
  const hasScheduleD = scheduleDRequired(input);

  // ---------- Schedule 1 ----------
  const S1: Lines = {};
  S1['3'] = sum(scheduleCs.map((c) => c.lines['31']));
  S1['10'] = S1['3'];
  S1['15'] = seDeduction;
  S1['16'] = seRetirement;
  S1['17'] = seHealth;
  S1['26'] = S1['15'] + S1['16'] + S1['17'];

  // ---------- Form 1040 income ----------
  const F: Lines = {};
  F['1a'] = sum(w2s.map((w) => amt(w.wages)));
  F['1z'] = F['1a'];
  F['2a'] = taxExemptInterest;
  F['2b'] = B['4'];
  F['3a'] = qualifiedDividends;
  F['3b'] = B['6'];
  // 2025 Form 1040 line 7a is capital gain or (loss) — Schedule D line 21, or
  // capital-gain distributions when Schedule D is not required. Line 7 is an
  // internal alias only. Line 9 = 1z + 2b + 3b + 4b + 5b + 6b + 7a + 8.
  F['4b'] = 0;
  F['5b'] = 0;
  F['6b'] = 0;
  F['7a'] = hasScheduleD ? D['21'] : capGainDistributions;
  F['7'] = F['7a'];
  F['8'] = S1['10'];
  F['9'] = F['1z'] + F['2b'] + F['3b'] + F['4b'] + F['5b'] + F['6b'] + F['7a'] + F['8'];
  F['10'] = S1['26'];
  F['11a'] = F['9'] - F['10'];
  F['11b'] = F['11a'];
  const agi = F['11b'];

  // ---------- Standard deduction ----------
  const tp = input.taxpayer;
  const sp = input.spouse;
  let boxes = (is65OrOver(tp) === true ? 1 : 0) + (tp.blind === true ? 1 : 0);
  if (joint) boxes += (is65OrOver(sp) === true ? 1 : 0) + (sp.blind === true ? 1 : 0);
  const perBox = fs === 'single' || fs === 'hoh' ? ADDITIONAL_STD_DEDUCTION_UNMARRIED : ADDITIONAL_STD_DEDUCTION_MARRIED;
  const earnedForStd = F['1z'] + S1['3'] - S1['15'];
  let basic = STANDARD_DEDUCTION[fs];
  if (input.canBeClaimedAsDependent === true) {
    basic = Math.min(earnedForStd > 900 ? earnedForStd + DEPENDENT_STD_DEDUCTION_EARNED_ADDON : DEPENDENT_STD_DEDUCTION_MIN, basic);
  }
  let standardDeduction = basic + boxes * perBox;
  if (fs === 'mfs' && input.spouseItemizes === true) standardDeduction = 0;

  // ---------- Schedule A ----------
  const it = input.itemized;
  const A: Lines = {};
  A['1'] = amt(it.medical);
  A['2'] = agi;
  A['3'] = dollars(pos(agi) * MEDICAL_AGI_FLOOR);
  A['4'] = pos(A['1'] - A['3']);
  A['5a'] = amt(it.stateLocalIncomeOrSalesTax);
  A['5b'] = amt(it.realEstateTax);
  A['5c'] = amt(it.personalPropertyTax);
  A['5d'] = A['5a'] + A['5b'] + A['5c'];
  let saltWs: Lines | null = null;
  const mfs = fs === 'mfs';
  const unlimitedUpTo = mfs ? SALT.floorMfs : SALT.floor;
  if (A['5d'] <= unlimitedUpTo) {
    A['5e'] = A['5d'];
  } else if (agi <= (mfs ? SALT.phaseDownStartMfs : SALT.phaseDownStart)) {
    A['5e'] = Math.min(A['5d'], mfs ? SALT.mfsCap : SALT.baseCap);
  } else {
    // State and Local Tax Deduction Worksheet (Schedule A instructions)
    const w: Lines = {};
    w['1'] = SALT.baseCap;
    w['2'] = agi;
    w['3e'] = 0;
    w['4'] = w['2'] + w['3e'];
    w['5'] = mfs ? SALT.phaseDownStartMfs : SALT.phaseDownStart;
    w['6'] = pos(w['4'] - w['5']);
    w['7'] = dollars(w['6'] * SALT.phaseDownRate);
    w['8'] = w['1'] - w['7'];
    w['9'] = Math.max(w['8'], SALT.floor);
    w['10'] = Math.min(mfs ? dollars(w['9'] / 2) : w['9'], A['5d']);
    A['5e'] = w['10'];
    saltWs = w;
  }
  A['6'] = amt(it.otherTaxes);
  A['7'] = A['5e'] + A['6'];
  const mortgageRaw = amt(it.mortgageInterest1098) + amt(it.mortgageInterestNo1098) + amt(it.pointsNo1098);
  const mortgageAllowed = limitedMortgageInterest(mortgageRaw, it.mortgageAverageBalance, fs, warnings);
  // Preserve the 1098 / non-1098 / points split, scaled if the debt cap applies.
  const mortgageScale = mortgageRaw > 0 ? mortgageAllowed / mortgageRaw : 1;
  A['8a'] = dollars(amt(it.mortgageInterest1098) * mortgageScale);
  A['8b'] = dollars(amt(it.mortgageInterestNo1098) * mortgageScale);
  A['8c'] = dollars(amt(it.pointsNo1098) * mortgageScale);
  A['8e'] = A['8a'] + A['8b'] + A['8c'];
  const f4952 = form4952(
    it.investmentInterest, it.investmentInterestCarryover, B['4'], B['6'], qualifiedDividends,
    hasScheduleD ? D['7'] : 0, warnings,
  );
  A['9'] = f4952.deductible;
  A['10'] = A['8e'] + A['9'];
  const charity = applyCharityLimits(it.charityCash, it.charityNonCash, it.charityCarryover, agi, warnings);
  A['11'] = charity.cash;
  A['12'] = charity.nonCash;
  A['13'] = charity.carryoverUsed;
  A['14'] = A['11'] + A['12'] + A['13'];
  A['15'] = amt(it.casualtyLoss);
  A['16'] = amt(it.otherItemized);
  A['17'] = A['4'] + A['7'] + A['10'] + A['14'] + A['15'] + A['16'];
  const itemizedDeduction = A['17'];

  const usesItemized = (fs === 'mfs' && input.spouseItemizes) || input.forceItemize || itemizedDeduction > standardDeduction;
  A['18'] = usesItemized && itemizedDeduction <= standardDeduction ? 1 : 0;
  F['12e'] = usesItemized ? itemizedDeduction : standardDeduction;

  // ---------- Schedule 1-A (tips, overtime, car-loan interest, seniors) ----------
  const qualifiedTips = sum(w2s.map((w) => amt(w.qualifiedTips))) + sum(businesses.map((b) => amt(b.qualifiedTips)));
  const qualifiedOvertime = sum(w2s.map((w) => amt(w.qualifiedOvertime)));
  const S1A = schedule1A(input, agi, qualifiedTips, qualifiedOvertime, warnings);
  F['13b'] = S1A['38'];

  // ---------- QBI (Form 8995 or 8995-A) ----------
  const taxableIncomeBeforeQbi = agi - F['12e'] - F['13b'];
  const prefGain = hasScheduleD ? dRes.preferentialGain : capGainDistributions;
  const qbiRes = computeQbi(
    fs, scheduleCs, ses, seAdj, businesses, input.qbiLossCarryforward,
    taxableIncomeBeforeQbi, qualifiedDividends + prefGain, S1A['13'], warnings,
  );
  const Q = qbiRes.form8995;
  F['13a'] = scheduleCs.length ? qbiRes.deduction : 0;
  F['14'] = F['12e'] + F['13a'] + F['13b'];
  F['15'] = pos(F['11b'] - F['14']);
  const ti = F['15'];

  // ---------- Tax (line 16) ----------
  let qdcg: Lines | null = null;
  let taxMethod: TaxResult['taxMethod'];
  if (qualifiedDividends > 0 || prefGain > 0) {
    qdcg = qdcgWorksheet(ti, qualifiedDividends, prefGain, fs);
    F['16'] = qdcg['25'];
    taxMethod = 'qdcg-worksheet';
  } else {
    F['16'] = regularTax(ti, fs);
    taxMethod = ti < TAX_TABLE_LIMIT ? 'table' : 'computation-worksheet';
  }
  const amtLines = form6251({
    fs,
    agi,
    form1040Line14: F['14'],
    seniorDeduction: S1A['37'],
    usesItemized,
    scheduleATaxes: A['7'],
    standardDeductionUsed: usesItemized ? 0 : F['12e'],
    medicalDeducted: usesItemized ? A['4'] : 0,
    regularTaxLine16: F['16'],
    qualifiedDividends,
    preferentialGain: prefGain,
    taxableIncome: ti,
    warnings,
  });
  const S2: Lines = {};
  S2['2'] = amtLines['11'];
  S2['3'] = S2['2'];
  F['17'] = S2['3'];
  F['18'] = F['16'] + F['17'];

  // ---------- Form 8959 Additional Medicare Tax ----------
  const M: Lines = {};
  M['1'] = sum(w2s.map((w) => amt(w.medicareWages)));
  M['4'] = M['1'];
  M['5'] = ADDITIONAL_MEDICARE.threshold[fs];
  M['6'] = pos(M['4'] - M['5']);
  M['7'] = dollars(M['6'] * ADDITIONAL_MEDICARE.rate);
  M['8'] = pos(sum(ses.map((s) => s.lines['6'])));
  M['9'] = M['5'];
  M['10'] = M['4'];
  M['11'] = pos(M['9'] - M['10']);
  M['12'] = pos(M['8'] - M['11']);
  M['13'] = dollars(M['12'] * ADDITIONAL_MEDICARE.rate);
  M['18'] = M['7'] + M['13'];
  M['19'] = sum(w2s.map((w) => amt(w.medicareTax)));
  M['20'] = M['1'];
  M['21'] = dollars(M['20'] * ADDITIONAL_MEDICARE.regularMedicareRate);
  M['22'] = pos(M['19'] - M['21']);
  M['24'] = M['22'];

  // ---------- Form 8960 NIIT ----------
  const N: Lines = {};
  N['1'] = F['2b'];
  N['2'] = F['3b'];
  N['5a'] = hasScheduleD ? pos(D['16']) : capGainDistributions;
  N['8'] = N['1'] + N['2'] + N['5a'];
  N['12'] = N['8'];
  N['13'] = agi;
  N['14'] = NIIT.threshold[fs];
  N['15'] = pos(N['13'] - N['14']);
  N['16'] = Math.min(N['12'], N['15']);
  N['17'] = dollars(pos(N['16']) * NIIT.rate);
  if (N['17'] > 0)
    warnings.push({ level: 'info', message: 'Net investment income tax applies. Investment expenses (Form 8960 Part II) are not deducted in this version.' });

  // ---------- Schedule 2 Part II ----------
  S2['4'] = seTax;
  S2['7'] = 0;
  S2['11'] = M['18'];
  S2['12'] = N['17'];
  S2['21'] = S2['4'] + S2['7'] + S2['11'] + S2['12'];

  // ---------- Earned income credit ----------
  const eicEarned = pos(F['1z'] + S1['3'] - S1['15']);
  const eicInv = eicInvestmentIncome(F['2b'], F['3b'], capGainDistributions, hasScheduleD ? D['16'] : 0);
  const eicRes = earnedIncomeCredit(input, agi, eicEarned, eicInv, warnings);

  // ---------- Schedule 8812 ----------
  const C: Lines = {};
  const elig = creditEligibility(input);
  const taxpayerSSNOk = elig.ctcTaxpayerOk === true;
  const ctcKids = taxpayerSSNOk ? elig.ctcChildren : 0;
  const others = elig.ctcTaxpayerOk === false
    ? elig.odcDependents + elig.ctcChildren
    : taxpayerSSNOk
      ? elig.odcDependents
      : 0;
  if (elig.ctcTaxpayerOk === false && input.dependents.some((d) => d.under17 === true))
    warnings.push({ level: 'warn', message: 'No SSN valid for employment for the taxpayer (or either spouse if MFJ): child tax credit not allowed; children counted for the $500 credit for other dependents only — verify eligibility.' });
  C['1'] = agi;
  C['2d'] = 0;
  C['3'] = C['1'] + C['2d'];
  C['4'] = ctcKids;
  C['5'] = ctcKids * CTC.perChild;
  C['6'] = others;
  C['7'] = others * CTC.perOtherDependent;
  C['8'] = C['5'] + C['7'];
  C['9'] = joint ? CTC.phaseOutStartMfj : CTC.phaseOutStartOther;
  const over = C['3'] - C['9'];
  C['10'] = over > 0 ? Math.ceil(over / 1000) * 1000 : 0;
  C['11'] = dollars(C['10'] * 0.05);
  C['12'] = pos(C['8'] - C['11']);
  C['13'] = F['18']; // Credit Limit Worksheet A (no Schedule 3 credits in this version)
  C['14'] = Math.min(C['12'], C['13']);
  F['19'] = C['14'];
  // Part II-A
  C['16a'] = C['12'] - C['14'];
  C['16b'] = ctcKids * CTC.refundablePerChild;
  C['17'] = Math.min(C['16a'], C['16b']);
  C['18a'] = pos(F['1z'] + S1['3'] - S1['15']);
  C['19'] = C['18a'] > CTC.earnedIncomeFloor ? C['18a'] - CTC.earnedIncomeFloor : 0;
  C['20'] = dollars(C['19'] * CTC.earnedIncomeRate);
  if (C['16a'] <= 0 || C['16b'] <= 0) {
    C['27'] = 0;
  } else if (C['16b'] < CTC.partIIBTrigger) {
    C['27'] = Math.min(C['17'], C['20']);
  } else if (C['20'] >= C['17']) {
    C['27'] = C['17'];
  } else {
    // Part II-B (3+ qualifying children)
    const ssTax = sum(w2s.map((w) => amt(w.socialSecurityTax)));
    const medTax = sum(w2s.map((w) => amt(w.medicareTax)));
    const needsWs = M['7'] > 0 || M['13'] > 0 || M['22'] > 0;
    C['21'] = needsWs ? ssTax + medTax + M['7'] - M['22'] + dollars(M['13'] / 2) : ssTax + medTax;
    C['22'] = S1['15'];
    C['23'] = C['21'] + C['22'];
    C['24'] = eicRes.credit;
    C['25'] = pos(C['23'] - C['24']);
    C['26'] = Math.max(C['20'], C['25']);
    C['27'] = Math.min(C['17'], C['26']);
  }
  F['28'] = C['27'];

  // ---------- Credits, total tax ----------
  const S3: Lines = { '8': 0, '15': 0 };
  F['20'] = S3['8'];
  F['21'] = F['19'] + F['20'];
  F['22'] = pos(F['18'] - F['21']);
  F['23'] = S2['21'];
  F['24'] = F['22'] + F['23'];

  // ---------- Payments ----------
  F['25a'] = sum(w2s.map((w) => amt(w.federalWithholding)));
  F['25b'] = sum(input.interest.map((i) => amt(i.federalWithholding))) + sum(input.dividends.map((d) => amt(d.federalWithholding)));
  F['25c'] = M['24'];
  F['25d'] = F['25a'] + F['25b'] + F['25c'];
  F['26'] = amt(input.estimatedPayments);
  F['27a'] = eicRes.credit;
  F['29'] = 0;
  F['30'] = 0;
  F['31'] = S3['15'];
  F['32'] = F['27a'] + F['28'] + F['29'] + F['30'] + F['31'];
  F['33'] = F['25d'] + F['26'] + F['32'];
  const f2210 = input.priorYearTax > 0
    ? form2210({
      fs,
      currentYearTax: F['24'],
      withholding: F['25d'],
      estimatedPayments: F['26'],
      priorYearTax: input.priorYearTax,
      priorYearAgi: input.priorYearAgi,
      refundableCredits: F['32'],
      warnings,
    })
    : { penalty: 0, lines: { '19': 0 } as Lines };
  if (input.priorYearTax <= 0 && pos(F['24'] - F['25d']) >= 1000 && F['26'] === 0) {
    warnings.push({
      level: 'info',
      message: 'You may owe an estimated-tax penalty (Form 2210). Enter last year’s tax to have the equal-installment regular method computed; otherwise the IRS will bill any penalty.',
    });
  }
  F['38'] = f2210.penalty;
  const overpay = F['33'] - F['24'];
  if (overpay > 0) {
    F['34'] = overpay;
    F['35a'] = pos(overpay - F['38']);
    F['37'] = pos(F['38'] - overpay);
  } else {
    F['34'] = 0;
    F['35a'] = 0;
    F['37'] = -overpay + F['38'];
  }

  // ---------- Sanity warnings ----------
  if ((fs === 'hoh' || fs === 'qss') && input.dependents.length === 0)
    warnings.push({ level: 'warn', message: 'Head of household / qualifying surviving spouse generally requires a qualifying person.' });
  if (F['1z'] > 0 && w2s.some((w) => amt(w.socialSecurityWages) === 0 && amt(w.wages) > 0))
    warnings.push({ level: 'info', message: 'A W-2 has wages but no social security wages (box 3); Schedule SE line 8a uses box 3.' });
  const out: TaxResult = {
    form1040: F,
    schedule1: S1,
    schedule1A: S1A,
    schedule2: S2,
    schedule3: S3,
    scheduleA: A,
    saltWorksheet: saltWs,
    scheduleB: B,
    scheduleC: scheduleCs,
    scheduleSE: ses,
    scheduleD: D,
    form8949: dRes.form8949,
    schedule8812: C,
    form8995: Q,
    form8995A: qbiRes.form8995A,
    form6251: amtLines,
    form4952: f4952.lines,
    form2210: f2210.lines,
    form8959: M,
    form8960: N,
    qdcgWorksheet: qdcg,
    standardDeduction,
    itemizedDeduction,
    usesItemized,
    taxMethod,
    refund: F['35a'],
    amountOwed: F['37'],
    effectiveRate: agi > 0 ? F['24'] / agi : 0,
    marginalRate: marginalRate(ti, fs),
    charityCarryoverToNextYear: charity.carryoverNext,
    investmentInterestCarryoverToNextYear: f4952.carryoverNext,
    capitalLossCarryoverToNextYear: { st: D['carrySt'] ?? 0, lt: D['carryLt'] ?? 0 },
    warnings,
    trace: [],
    scope: { status: 'complete', missingFacts: [], invalidFacts: [], unsupportedFacts: [], previews: [] },
  };
  const withholding = F['25d'];
  const previews: ComponentPreview[] = [
    { id: 'wages', label: 'W-2 wages (Form 1040 line 1z)', amount: F['1z'], note: 'Component preview — not a complete return.' },
    { id: 'withholding', label: 'Federal withholding', amount: withholding, note: 'Component preview — not a complete return.' },
    { id: 'taxable-income', label: 'Taxable income (line 15)', amount: F['15'], note: 'Uses answered facts only; credits may still be gated.' },
  ];
  out.scope = buildScope(input, warnings, previews);
  if (out.scope.status !== 'complete') {
    warnings.unshift({
      level: out.scope.status === 'invalid' ? 'warn' : out.scope.status === 'blocked' ? 'unsupported' : 'warn',
      message:
        out.scope.status === 'invalid'
          ? 'This is not a complete result: one or more amounts are invalid.'
          : out.scope.status === 'blocked'
            ? 'This is not a complete result: declared facts are outside the supported 2025 scope.'
            : 'This is not a complete result: required household or eligibility facts are still unanswered.',
    });
  }
  out.trace = buildTrace(out);
  return out;
}
