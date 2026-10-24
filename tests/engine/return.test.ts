import { describe, expect, it } from 'vitest';
import { blankPerson, completeAdult, computeReturn, sampleReturn } from '../../src/engine';
import { biz, kid, ret, w2 } from './helpers';

const senior = completeAdult({ bornBefore1961: true, dateOfBirth: '1955-01-01', ageAtYearEnd: 70 });

describe('Standard deduction (OBBBA amounts, 2025)', () => {
  it.each([
    ['single', 15_750], ['mfs', 15_750], ['mfj', 31_500], ['qss', 31_500], ['hoh', 23_625],
  ] as const)('%s basic = %d', (fs, amt) => {
    expect(computeReturn(ret({ filingStatus: fs })).standardDeduction).toBe(amt);
  });
  it('matches the chart for people born before Jan 2, 1961 or blind', () => {
    expect(computeReturn(ret({ filingStatus: 'single', taxpayer: senior })).standardDeduction).toBe(17_750);
    expect(computeReturn(ret({ filingStatus: 'single', taxpayer: { ...senior, blind: true } })).standardDeduction).toBe(19_750);
    expect(computeReturn(ret({ filingStatus: 'mfj', taxpayer: { ...senior, blind: true }, spouse: { ...senior, blind: true } })).standardDeduction).toBe(37_900);
    expect(computeReturn(ret({ filingStatus: 'mfj', taxpayer: senior })).standardDeduction).toBe(33_100);
    expect(computeReturn(ret({ filingStatus: 'mfs', taxpayer: senior })).standardDeduction).toBe(17_350);
    expect(computeReturn(ret({ filingStatus: 'hoh', taxpayer: { ...senior, blind: true } })).standardDeduction).toBe(27_625);
    expect(computeReturn(ret({ filingStatus: 'qss', taxpayer: { ...senior, blind: true } })).standardDeduction).toBe(34_700);
  });
  it('dependent worksheet: greater of $1,350 or earned + $450, capped at basic', () => {
    expect(computeReturn(ret({ canBeClaimedAsDependent: true, w2s: [w2(5_000)] })).standardDeduction).toBe(5_450);
    expect(computeReturn(ret({ canBeClaimedAsDependent: true, w2s: [w2(500)] })).standardDeduction).toBe(1_350);
    expect(computeReturn(ret({ canBeClaimedAsDependent: true, w2s: [w2(20_000)] })).standardDeduction).toBe(15_750);
  });
  it('MFS with spouse itemizing: standard deduction is zero and itemized is used', () => {
    const r = computeReturn(ret({ filingStatus: 'mfs', spouseItemizes: true, w2s: [w2(50_000)], itemized: { ...ret().itemized, charityCash: 1_000 } }));
    expect(r.standardDeduction).toBe(0);
    expect(r.usesItemized).toBe(true);
    expect(r.form1040['12e']).toBe(1_000);
  });
});

describe('Simple returns (hand-checked)', () => {
  it('single W-2 $50,000, $6,000 withheld -> refund $2,125', () => {
    // TI = 50,000 − 15,750 = 34,250; table row 34,250–34,300 midpoint 34,275:
    // 1,192.50 + 12% × (34,275 − 11,925) = 3,874.50 -> $3,875
    const r = computeReturn(ret({ w2s: [w2(50_000, 6_000)] }));
    expect(r.form1040['15']).toBe(34_250);
    expect(r.form1040['16']).toBe(3_875);
    expect(r.taxMethod).toBe('table');
    expect(r.refund).toBe(2_125);
    expect(r.amountOwed).toBe(0);
  });
  it('single W-2 $150,000 with too little withheld -> amount owed', () => {
    // TI 134,250: 134,250 × 24% − 7,153 = 25,067
    const r = computeReturn(ret({ w2s: [w2(150_000, 20_000)] }));
    expect(r.form1040['16']).toBe(25_067);
    expect(r.taxMethod).toBe('computation-worksheet');
    expect(r.amountOwed).toBe(5_067);
  });
  it('zero income return produces zeros, not NaN', () => {
    const r = computeReturn(ret());
    expect(r.form1040['24']).toBe(0);
    expect(r.refund).toBe(0);
    expect(Object.values(r.form1040).every(Number.isFinite)).toBe(true);
  });
});

describe('Schedule A', () => {
  it('medical expenses only above 7.5% of AGI', () => {
    const r = computeReturn(ret({ w2s: [w2(80_000)], itemized: { ...ret().itemized, medical: 10_000 } }));
    expect(r.scheduleA['3']).toBe(6_000);
    expect(r.scheduleA['4']).toBe(4_000);
  });
  it('SALT capped at $40,000 at or below $500,000 AGI', () => {
    const r = computeReturn(ret({ w2s: [w2(100_000)], itemized: { ...ret().itemized, stateLocalIncomeOrSalesTax: 30_000, realEstateTax: 15_000 } }));
    expect(r.scheduleA['5d']).toBe(45_000);
    expect(r.scheduleA['5e']).toBe(40_000);
    expect(r.saltWorksheet).toBeNull();
  });
  it('SALT phase-down: AGI $550,000 -> 40,000 − 30% × 50,000 = $25,000', () => {
    const r = computeReturn(ret({ w2s: [w2(550_000)], itemized: { ...ret().itemized, stateLocalIncomeOrSalesTax: 50_000 } }));
    expect(r.scheduleA['5e']).toBe(25_000);
    expect(r.saltWorksheet?.['7']).toBe(15_000);
  });
  it('SALT phase-down floors at $10,000', () => {
    const r = computeReturn(ret({ w2s: [w2(800_000)], itemized: { ...ret().itemized, stateLocalIncomeOrSalesTax: 60_000 } }));
    expect(r.scheduleA['5e']).toBe(10_000);
  });
  it('MFS SALT: $20,000 cap; worksheet halves line 9 above $250,000', () => {
    const a = computeReturn(ret({ filingStatus: 'mfs', w2s: [w2(200_000)], itemized: { ...ret().itemized, stateLocalIncomeOrSalesTax: 30_000 } }));
    expect(a.scheduleA['5e']).toBe(20_000);
    // AGI 300,000: 40,000 − 30% × 50,000 = 25,000; larger of that or 10,000 = 25,000; half = 12,500
    const b = computeReturn(ret({ filingStatus: 'mfs', w2s: [w2(300_000)], itemized: { ...ret().itemized, stateLocalIncomeOrSalesTax: 30_000 } }));
    expect(b.scheduleA['5e']).toBe(12_500);
  });
  it('SALT at or under $10,000 is never limited', () => {
    const r = computeReturn(ret({ w2s: [w2(900_000)], itemized: { ...ret().itemized, realEstateTax: 9_000 } }));
    expect(r.scheduleA['5e']).toBe(9_000);
  });
  it('chooses the larger of itemized and standard; honors election to itemize', () => {
    const small = { ...ret().itemized, mortgageInterest1098: 8_000 };
    expect(computeReturn(ret({ w2s: [w2(70_000)], itemized: small })).usesItemized).toBe(false);
    const forced = computeReturn(ret({ w2s: [w2(70_000)], itemized: small, forceItemize: true }));
    expect(forced.usesItemized).toBe(true);
    expect(forced.form1040['12e']).toBe(8_000);
    expect(forced.scheduleA['18']).toBe(1);
  });
});

describe('Schedule C and Schedule SE', () => {
  it('computes COGS, 50% meals and net profit', () => {
    const b = biz(100_000);
    b.hasInventory = true;
    b.cogs = { beginningInventory: 5_000, purchases: 20_000, costOfLabor: 3_000, materialsSupplies: 1_000, otherCosts: 500, endingInventory: 4_500 };
    b.returnsAllowances = 2_000;
    b.otherIncome = 250;
    b.expenses.mealsTotal = 1_001; // 500.50 -> 501
    b.expenses.advertising = 1_000;
    b.homeOffice = 1_200;
    const c = computeReturn(ret({ businesses: [b] })).scheduleC[0].lines;
    expect(c['42']).toBe(25_000);
    expect(c['5']).toBe(73_000);
    expect(c['7']).toBe(73_250);
    expect(c['24b']).toBe(501);
    expect(c['28']).toBe(1_501);
    expect(c['31']).toBe(70_549);
  });
  it('SE tax for $57,500 profit: $8,125 and $4,063 deduction', () => {
    const r = computeReturn(ret({ businesses: [biz(57_500)] }));
    const se = r.scheduleSE[0].lines;
    expect(se['4a']).toBe(53_101);
    expect(se['10']).toBe(6_585);
    expect(se['11']).toBe(1_540);
    expect(se['12']).toBe(8_125);
    expect(r.schedule1['15']).toBe(4_063);
    expect(r.schedule2['4']).toBe(8_125);
  });
  it('coordinates the $176,100 wage base with W-2 social security wages', () => {
    const r = computeReturn(ret({ w2s: [w2(170_000)], businesses: [biz(50_000)] }));
    const se = r.scheduleSE[0].lines;
    expect(se['6']).toBe(46_175);
    expect(se['9']).toBe(6_100);
    expect(se['10']).toBe(756);
    expect(se['11']).toBe(1_339);
    expect(se['12']).toBe(2_095);
    // Additional Medicare Tax on SE income: 46,175 − (200,000 − 170,000) = 16,175 × 0.9% = 145.58
    expect(r.form8959['13']).toBe(146);
  });
  it('no SE tax when net earnings are under $400', () => {
    // 433 × 0.9235 = 399.88, which rounds to $400 under whole-dollar rounding, so SE tax applies
    const r = computeReturn(ret({ businesses: [biz(433)] }));
    const r2 = computeReturn(ret({ businesses: [biz(400)] })); // 369
    expect(r2.schedule2['4']).toBe(0);
    expect(r.scheduleSE[0].lines['4a']).toBe(400);
    expect(r.schedule2['4']).toBe(Math.round(400 * 0.124) + Math.round(400 * 0.029));
  });
  it('combines multiple businesses of the same owner on one Schedule SE', () => {
    const r = computeReturn(ret({ businesses: [biz(30_000), biz(20_000)] }));
    expect(r.scheduleSE).toHaveLength(1);
    expect(r.scheduleSE[0].lines['12']).toBe(5_726 + 1_339);
    expect(r.form8995['2']).toBe(50_000 - r.schedule1['15']);
  });
  it('separate Schedule SE per spouse on a joint return', () => {
    const r = computeReturn(ret({ filingStatus: 'mfj', businesses: [biz(40_000, 0, 'taxpayer'), biz(10_000, 0, 'spouse')] }));
    expect(r.scheduleSE.map((s) => s.owner).sort()).toEqual(['spouse', 'taxpayer']);
  });
  it('a business loss offsets wages and creates no SE tax', () => {
    const r = computeReturn(ret({ w2s: [w2(60_000)], businesses: [biz(5_000, 15_000)] }));
    expect(r.schedule1['3']).toBe(-10_000);
    expect(r.form1040['11b']).toBe(50_000);
    expect(r.schedule2['4']).toBe(0);
    expect(r.form1040['13a']).toBe(0);
  });
  it('ignores spouse-owned items unless filing jointly (with a warning)', () => {
    const r = computeReturn(ret({ filingStatus: 'single', businesses: [biz(10_000, 0, 'spouse')] }));
    expect(r.scheduleC).toHaveLength(0);
    expect(r.warnings.some((w) => w.message.includes('Spouse-owned'))).toBe(true);
  });
});

describe('QBI deduction (Form 8995)', () => {
  it('limited by 20% of taxable income less qualified dividends', () => {
    // profit 20,000: SE 2,826, deduction 1,413. AGI = 20,000 + 10,000 − 1,413 = 28,587.
    // line 11 = 28,587 − 15,750 = 12,837; line 13 = 2,837; line 14 = 567. QBI component = 18,587 × 20% = 3,717.
    const r = computeReturn(ret({ businesses: [biz(20_000)], dividends: [{ id: 'd', payer: 'X', ordinary: 10_000, qualified: 10_000, capitalGainDistributions: 0, federalWithholding: 0 }] }));
    expect(r.form8995['5']).toBe(3_717);
    expect(r.form8995['11']).toBe(12_837);
    expect(r.form8995['14']).toBe(567);
    expect(r.form1040['13a']).toBe(567);
  });
  it('applies the prior-year QBI loss carryforward', () => {
    const r = computeReturn(ret({ w2s: [w2(80_000)], businesses: [biz(10_000)], qbiLossCarryforward: 4_000 }));
    expect(r.form8995['4']).toBe(r.form8995['2'] - 4_000);
  });
  it('above the 2025 threshold ($197,300 single) Form 8995-A applies; $0 wages/UBIA → $0 QBI', () => {
    const r = computeReturn(ret({ businesses: [biz(300_000)] }));
    expect(r.form8995A).not.toBeNull();
    expect(r.form1040['13a']).toBe(0);
    expect(r.warnings.some((w) => w.message.includes('8995-A'))).toBe(true);
  });
  it('MFJ threshold is $394,600', () => {
    const r = computeReturn(ret({ filingStatus: 'mfj', w2s: [w2(250_000)], businesses: [biz(100_000)] }));
    expect(r.form8995['11']).toBeLessThan(394_600);
    expect(r.form1040['13a']).toBeGreaterThan(0);
  });
});

describe('Child tax credit / credit for other dependents (Schedule 8812)', () => {
  it('$2,200 per qualifying child and $500 per other dependent', () => {
    const r = computeReturn(ret({ filingStatus: 'mfj', w2s: [w2(150_000)], dependents: [kid(1), kid(2), kid(3, false)] }));
    expect(r.schedule8812['5']).toBe(4_400);
    expect(r.schedule8812['7']).toBe(500);
    expect(r.form1040['19']).toBe(4_900);
  });
  it('phase-out rounds the excess up to the next $1,000 (MFJ AGI $412,500)', () => {
    const r = computeReturn(ret({ filingStatus: 'mfj', w2s: [w2(412_500)], dependents: [kid(1)] }));
    expect(r.schedule8812['10']).toBe(13_000);
    expect(r.schedule8812['11']).toBe(650);
    expect(r.schedule8812['12']).toBe(1_550);
  });
  it('refundable ACTC (HOH, 2 kids, $30,000 wages) = $3,400 plus EIC', () => {
    // TI 6,375 -> table 638; nonrefundable 638; ACTC = min(3,762, 3,400, 15% × 27,500 = 4,125) = 3,400
    // EIC table (2 children, HOH): $50 row $30,000–$30,050 midpoint $30,025
    // → max $7,152 − 21.06% × ($30,025 − $23,350) = 7,152 − 1,406 = $5,746
    const r = computeReturn(ret({ filingStatus: 'hoh', w2s: [w2(30_000, 1_000)], dependents: [kid(1), kid(2)] }));
    expect(r.form1040['16']).toBe(638);
    expect(r.form1040['19']).toBe(638);
    expect(r.form1040['28']).toBe(3_400);
    expect(r.form1040['27a']).toBe(5_746);
    expect(r.refund).toBe(4_400 + 5_746);
  });
  it('ACTC limited by 15% of earned income over $2,500', () => {
    const r = computeReturn(ret({ filingStatus: 'hoh', w2s: [w2(10_000)], dependents: [kid(1), kid(2)] }));
    expect(r.form1040['28']).toBe(1_125);
  });
  it('Part II-B (3+ children) uses withheld social security and Medicare tax, reduced by EIC', () => {
    // wages 4,000: line 20 = 15% × 1,500 = 225; line 21 = 248 + 58 = 306
    // EIC table: $4,000–$4,050 midpoint $4,025 × 45% = $1,811; line 25 still 0; ACTC = $225
    const r = computeReturn(ret({ filingStatus: 'mfj', w2s: [w2(4_000)], dependents: [kid(1), kid(2), kid(3)] }));
    expect(r.schedule8812['20']).toBe(225);
    expect(r.schedule8812['21']).toBe(306);
    expect(r.schedule8812['24']).toBe(1_811);
    expect(r.form1040['27a']).toBe(1_811);
    expect(r.form1040['28']).toBe(225);
  });
  it('§ 24(h)(4)(C): a child denied CTC under the SSN rule counts for the $500 ODC', () => {
    const r = computeReturn(ret({ filingStatus: 'hoh', w2s: [w2(60_000)], dependents: [kid(1, true, false)] }));
    expect(r.schedule8812['4']).toBe(0);
    expect(r.schedule8812['5']).toBe(0);
    expect(r.schedule8812['6']).toBe(1);
    expect(r.schedule8812['7']).toBe(500);
  });
  it('taxpayer without a valid SSN: no CTC (OBBBA), ODC only', () => {
    const r = computeReturn(ret({ filingStatus: 'hoh', taxpayer: { ...blankPerson(), hasValidSSN: false }, w2s: [w2(60_000)], dependents: [kid(1)] }));
    expect(r.schedule8812['5']).toBe(0);
    expect(r.schedule8812['7']).toBe(500);
  });
});

describe('Other taxes', () => {
  it('Additional Medicare Tax on wages and the matching withholding credit', () => {
    const r = computeReturn(ret({ w2s: [w2(250_000)] }));
    expect(r.form8959['7']).toBe(450);
    expect(r.form8959['22']).toBe(450);
    expect(r.form1040['25c']).toBe(450);
    expect(r.schedule2['11']).toBe(450);
  });
  it('Net investment income tax: 3.8% × lesser of NII or MAGI over threshold', () => {
    const r = computeReturn(ret({ w2s: [w2(190_000)], interest: [{ id: 'i', payer: 'Bank', taxable: 40_000, taxExempt: 0, federalWithholding: 0 }] }));
    expect(r.form8960['16']).toBe(30_000);
    expect(r.schedule2['12']).toBe(1_140);
  });
});

describe('Enhanced deduction for seniors (Schedule 1-A, OBBBA)', () => {
  it('phases down 6% over $75,000 (single)', () => {
    const r = computeReturn(ret({ taxpayer: senior, w2s: [w2(95_000)] }));
    expect(r.schedule1A['35']).toBe(4_800);
    expect(r.form1040['13b']).toBe(4_800);
    expect(r.form1040['15']).toBe(95_000 - 17_750 - 4_800);
  });
  it('MFJ both 65+ under $150,000 -> $12,000', () => {
    const r = computeReturn(ret({ filingStatus: 'mfj', taxpayer: senior, spouse: senior, w2s: [w2(100_000)] }));
    expect(r.form1040['13b']).toBe(12_000);
  });
  it('not allowed when married filing separately', () => {
    const r = computeReturn(ret({ filingStatus: 'mfs', taxpayer: senior, w2s: [w2(50_000)] }));
    expect(r.form1040['13b']).toBe(0);
  });
  it('requires a valid SSN', () => {
    const r = computeReturn(ret({ taxpayer: { ...senior, hasValidSSN: false }, w2s: [w2(50_000)] }));
    expect(r.form1040['13b']).toBe(0);
  });
});

describe('Schedule B, dividends, capital gain distributions', () => {
  it('totals interest and dividends and routes cap gain distributions to line 7a', () => {
    const r = computeReturn(ret({
      w2s: [w2(60_000)],
      interest: [{ id: 'a', payer: 'A', taxable: 1_000, taxExempt: 250, federalWithholding: 0 }, { id: 'b', payer: 'B', taxable: 700, taxExempt: 0, federalWithholding: 50 }],
      dividends: [{ id: 'c', payer: 'C', ordinary: 3_000, qualified: 2_000, capitalGainDistributions: 500, federalWithholding: 0 }],
    }));
    expect(r.scheduleB['4']).toBe(1_700);
    expect(r.scheduleB['6']).toBe(3_000);
    expect(r.form1040['2a']).toBe(250);
    expect(r.form1040['3a']).toBe(2_000);
    expect(r.form1040['7a']).toBe(500);
    expect(r.form1040['9']).toBe(65_200);
    expect(r.form1040['25b']).toBe(50);
    expect(r.taxMethod).toBe('qdcg-worksheet');
    expect(r.qdcgWorksheet?.['4']).toBe(2_500);
  });
  it('warns when qualified dividends exceed ordinary dividends', () => {
    const r = computeReturn(ret({ dividends: [{ id: 'c', payer: 'C', ordinary: 100, qualified: 200, capitalGainDistributions: 0, federalWithholding: 0 }] }));
    expect(r.warnings.some((w) => w.message.includes('exceed ordinary'))).toBe(true);
  });
});

describe('Sample return (Rivera household, MFJ) — full hand check', () => {
  const r = computeReturn(sampleReturn());
  const F = r.form1040;
  it('Schedule C: 72,000 − COGS 6,500 − expenses 8,000 = 57,500', () => {
    expect(r.scheduleC[0].lines['42']).toBe(6_500);
    expect(r.scheduleC[0].lines['28']).toBe(8_000);
    expect(r.scheduleC[0].lines['31']).toBe(57_500);
  });
  it('income and AGI', () => {
    expect(F['9']).toBe(98_000 + 1_850 + 2_400 + 300 + 57_500); // 160,050
    expect(F['10']).toBe(4_063);
    expect(F['11b']).toBe(155_987);
  });
  it('itemizes $35,000 over the $31,500 standard deduction', () => {
    // medical 4,000 < 7.5% × 155,987 = 11,699 -> 0; SALT 17,300; mortgage 14,200; gifts 3,500
    expect(r.scheduleA['4']).toBe(0);
    expect(r.scheduleA['5e']).toBe(17_300);
    expect(r.scheduleA['17']).toBe(35_000);
    expect(r.usesItemized).toBe(true);
  });
  it('QBI = 20% × (57,500 − 4,063) = 10,687', () => {
    expect(F['13a']).toBe(10_687);
    expect(F['15']).toBe(110_300);
  });
  it('tax via QDCG worksheet: 13,610 + 15% × 2,200 = 13,940', () => {
    expect(r.qdcgWorksheet?.['22']).toBe(13_610);
    expect(F['16']).toBe(13_940);
  });
  it('credits, other taxes, payments and balance due', () => {
    expect(F['19']).toBe(4_400);
    expect(F['22']).toBe(9_540);
    expect(F['23']).toBe(8_125);
    expect(F['24']).toBe(17_665);
    expect(F['33']).toBe(15_800);
    expect(r.amountOwed).toBe(1_865);
    expect(r.refund).toBe(0);
  });
});
