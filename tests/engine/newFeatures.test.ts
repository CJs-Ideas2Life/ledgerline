import { describe, expect, it } from 'vitest';
import { completeAdult, computeReturn } from '../../src/engine';
import { biz, kid, ret, w2 } from './helpers';

const senior = completeAdult({ bornBefore1961: true, dateOfBirth: '1955-01-01', ageAtYearEnd: 70 });

describe('Form 6251 AMT', () => {
  it('does not apply on a typical wage return taking the standard deduction', () => {
    const r = computeReturn(ret({ w2s: [w2(80_000)] }));
    expect(r.form6251['11']).toBe(0);
    expect(r.schedule2['2']).toBe(0);
  });
  it('adds back $40,000 of SALT and can produce AMT for a high-SALT itemizer', () => {
    // Single, AGI 400,000, SALT 40,000, mortgage 20,000 → itemized 60,000 > std 15,750
    // TI = 400,000 − 60,000 = 340,000; regular tax = 340,000 × 35% − 30,452.75 = 88,547
    // 6251 1b = TI + seniors = 340,000; 2a = 40,000; AMTI = 380,000
    // exemption 88,100; line 6 = 291,900; 28% × 291,900 − 4,782 = 76,950
    // AMT = pos(76,950 − 88,547) = 0
    const r = computeReturn(ret({
      w2s: [w2(400_000)],
      itemized: { ...ret().itemized, stateLocalIncomeOrSalesTax: 40_000, mortgageInterest1098: 20_000 },
    }));
    expect(r.usesItemized).toBe(true);
    expect(r.scheduleA['5e']).toBe(40_000);
    expect(r.form6251['2a']).toBe(40_000);
    expect(r.form6251['4']).toBe(380_000);
    expect(r.form6251['5']).toBe(88_100);
    expect(r.form6251['11']).toBe(0);
  });
  it('produces AMT when large SALT wipes out regular tax relative to AMTI', () => {
    // Single, wages 200,000, SALT 40,000, charity 20,000, mortgage 30,000 → itemized 90,000
    // TI = 110,000; regular tax = 110,000 × 24% − 7,153 = 19,247
    // 1b = 110,000; 2a = 40,000; AMTI = 150,000; exemption 88,100; line 6 = 61,900
    // TMT = 26% × 61,900 = 16,094; AMT = 0
    // Need still more itemized that AMT does not allow — medical above 7.5% but under 10%.
    // AGI 200,000: 7.5% = 15,000; 10% = 20,000. Medical 18,000 → regular 3,000; AMT addback 3,000.
    const r = computeReturn(ret({
      w2s: [w2(200_000)],
      itemized: {
        ...ret().itemized,
        stateLocalIncomeOrSalesTax: 40_000,
        mortgageInterest1098: 25_000,
        charityCash: 20_000,
        medical: 18_000,
      },
    }));
    expect(r.scheduleA['4']).toBe(3_000);
    expect(r.form6251['3']).toBe(3_000);
    expect(r.form6251['2a']).toBe(40_000);
  });
  it('adds back the enhanced senior deduction on line 1b', () => {
    const r = computeReturn(ret({ taxpayer: senior, w2s: [w2(50_000)] }));
    // TI = 50,000 − 17,750 − 6,000 = 26,250; 1b should be TI + 6,000 = 32,250
    expect(r.form1040['13b']).toBe(6_000);
    expect(r.form6251['1b']).toBe(r.form1040['15'] + 6_000);
  });
});

describe('Schedule D / Form 8949', () => {
  it('nets a short-term gain and a long-term loss and reports the combined figure on line 7', () => {
    const r = computeReturn(ret({
      w2s: [w2(60_000)],
      capitalGains: [
        { id: 'a', description: 'ST stock', dateAcquired: '2025-01-01', dateSold: '2025-06-01', proceeds: 8_000, cost: 5_000, term: 'short', collectible: false, unrecaptured1250: false },
        { id: 'b', description: 'LT stock', dateAcquired: '2020-01-01', dateSold: '2025-06-01', proceeds: 2_000, cost: 4_000, term: 'long', collectible: false, unrecaptured1250: false },
      ],
    }));
    expect(r.form8949).toHaveLength(2);
    expect(r.scheduleD['7']).toBe(3_000);
    expect(r.scheduleD['15']).toBe(-2_000);
    expect(r.scheduleD['16']).toBe(1_000);
    expect(r.form1040['7']).toBe(1_000);
    expect(r.form1040['9']).toBe(61_000);
  });
  it('limits a net capital loss to $3,000 and carries the rest forward', () => {
    const r = computeReturn(ret({
      w2s: [w2(50_000)],
      capitalGains: [
        { id: 'a', description: 'Loss', dateAcquired: '2024-01-01', dateSold: '2025-06-01', proceeds: 1_000, cost: 10_000, term: 'long', collectible: false, unrecaptured1250: false },
      ],
    }));
    expect(r.scheduleD['16']).toBe(-9_000);
    expect(r.form1040['7']).toBe(-3_000);
    expect(r.form1040['9']).toBe(47_000);
    expect(r.capitalLossCarryoverToNextYear).toEqual({ st: 0, lt: 6_000 });
  });
  it('MFS capital-loss limit is $1,500', () => {
    const r = computeReturn(ret({
      filingStatus: 'mfs',
      w2s: [w2(50_000)],
      capitalGains: [
        { id: 'a', description: 'Loss', dateAcquired: '2024-01-01', dateSold: '2025-06-01', proceeds: 0, cost: 5_000, term: 'short', collectible: false, unrecaptured1250: false },
      ],
    }));
    expect(r.form1040['7']).toBe(-1_500);
    expect(r.capitalLossCarryoverToNextYear.st).toBe(3_500);
  });
  it('flags collectibles and unrecaptured 1250 as not computed at special rates', () => {
    const r = computeReturn(ret({
      capitalGains: [
        { id: 'c', description: 'Gold', dateAcquired: '2020-01-01', dateSold: '2025-06-01', proceeds: 6_000, cost: 2_000, term: 'long', collectible: true, unrecaptured1250: false },
      ],
    }));
    expect(r.warnings.some((w) => w.message.includes('Collectibles'))).toBe(true);
  });
  it('includes capital gain distributions on Schedule D line 13 when there are sales', () => {
    const r = computeReturn(ret({
      dividends: [{ id: 'd', payer: 'Fund', ordinary: 100, qualified: 0, capitalGainDistributions: 400, federalWithholding: 0 }],
      capitalGains: [
        { id: 'a', description: 'ST', dateAcquired: '2025-01-01', dateSold: '2025-03-01', proceeds: 500, cost: 200, term: 'short', collectible: false, unrecaptured1250: false },
      ],
    }));
    expect(r.scheduleD['13']).toBe(400);
    expect(r.scheduleD['16']).toBe(700);
    expect(r.form1040['7']).toBe(700);
  });
});

describe('Earned income credit', () => {
  it('childless single: EIC table $8,000–$8,050 midpoint → $614', () => {
    const r = computeReturn(ret({ w2s: [w2(8_000)] }));
    expect(r.form1040['27a']).toBe(614);
  });
  it('one child, HOH, $12,730 earned: official EIC table $4,328 (EIA-containing row)', () => {
    const r = computeReturn(ret({ filingStatus: 'hoh', w2s: [w2(12_730)], dependents: [kid(1)] }));
    expect(r.form1040['27a']).toBe(4_328);
  });
  it('disallowed when investment income exceeds $11,950', () => {
    const r = computeReturn(ret({
      w2s: [w2(10_000)],
      dependents: [kid(1)],
      interest: [{ id: 'i', payer: 'Bank', taxable: 12_000, taxExempt: 0, federalWithholding: 0 }],
    }));
    expect(r.form1040['27a']).toBe(0);
  });
  it('disallowed for MFS unless the lived-apart exception is checked', () => {
    const a = computeReturn(ret({ filingStatus: 'mfs', w2s: [w2(10_000)], dependents: [kid(1)] }));
    expect(a.form1040['27a']).toBe(0);
    const b = computeReturn(ret({ filingStatus: 'mfs', mfsLivedApart: true, w2s: [w2(10_000)], dependents: [kid(1)] }));
    expect(b.form1040['27a']).toBeGreaterThan(0);
  });
  it('childless EIC is not allowed at age 65+', () => {
    const r = computeReturn(ret({ taxpayer: senior, w2s: [w2(8_000)] }));
    expect(r.form1040['27a']).toBe(0);
  });
});

describe('Form 8995-A QBI above the threshold', () => {
  it('QTB with W-2 wages: greater of 50% wages or 25% wages + 2.5% UBIA', () => {
    // Gross 380,000 − wages 80,000 = 300,000 profit (wages are both an expense and the 8995-A wage base).
    const b = biz(380_000);
    b.expenses.wages = 80_000;
    b.ubia = 200_000;
    const r = computeReturn(ret({ businesses: [b] }));
    // SE deduction 14,936; QBI = 300,000 − 14,936 = 285,064; 20% = 57,013
    // Limit = max(40,000, 20,000 + 5,000) = 40,000
    // TI before QBI = 285,064 − 15,750 = 269,314 > 247,300 → full limit → QBI = 40,000
    expect(r.form8995A).not.toBeNull();
    expect(r.form1040['13a']).toBe(40_000);
  });
  it('SSTB above the phase-in range is fully excluded', () => {
    const b = biz(380_000);
    b.isSstb = true;
    b.expenses.wages = 80_000;
    const r = computeReturn(ret({ businesses: [b] }));
    expect(r.form1040['13a']).toBe(0);
  });
  it('SSTB inside the phase-in range keeps the applicable percentage', () => {
    // W-2 220,000 + profit 40,000: SE deduction 2,826
    // AGI = 257,174; TI before QBI = 241,424 (inside $197,300–$247,300)
    const b = biz(40_000);
    b.isSstb = true;
    const r = computeReturn(ret({ w2s: [w2(220_000)], businesses: [b] }));
    expect(r.form8995['11']).toBeGreaterThan(197_300);
    expect(r.form8995['11']).toBeLessThan(247_300);
    expect(r.form1040['13a']).toBeGreaterThan(0);
    expect(r.form8995A).not.toBeNull();
  });
});

describe('Schedule 1-A tips, overtime, car-loan interest', () => {
  it('deducts qualified tips up to $25,000', () => {
    const r = computeReturn(ret({ w2s: [{ ...w2(40_000), qualifiedTips: 8_000 }] }));
    expect(r.schedule1A['13']).toBe(8_000);
    expect(r.form1040['13b']).toBe(8_000);
    expect(r.form1040['15']).toBe(40_000 - 15_750 - 8_000);
  });
  it('phases tips out $100 per $1,000 of MAGI over $150,000 (floor)', () => {
    // MAGI 152,400 → excess 2,400 → floor 2 × $100 = $200; 10,000 − 200 = 9,800
    const r = computeReturn(ret({ w2s: [{ ...w2(152_400), qualifiedTips: 10_000 }] }));
    expect(r.schedule1A['11']).toBe(2);
    expect(r.schedule1A['13']).toBe(9_800);
  });
  it('overtime cap is $12,500 single / $25,000 MFJ', () => {
    const s = computeReturn(ret({ w2s: [{ ...w2(50_000), qualifiedOvertime: 20_000 }] }));
    expect(s.schedule1A['21']).toBe(12_500);
    const j = computeReturn(ret({ filingStatus: 'mfj', w2s: [{ ...w2(50_000), qualifiedOvertime: 20_000 }] }));
    expect(j.schedule1A['21']).toBe(20_000);
  });
  it('car-loan interest phases out $200 per $1,000 of MAGI over $100,000 (ceiling)', () => {
    // MAGI 100,100 → excess 100 → ceil 1 × $200 = $200; 3,000 − 200 = 2,800
    const r = computeReturn(ret({ w2s: [w2(100_100)], carLoanInterest: 3_000 }));
    expect(r.schedule1A['28']).toBe(1);
    expect(r.schedule1A['30']).toBe(2_800);
  });
  it('tips and overtime are not allowed on an MFS return', () => {
    const r = computeReturn(ret({
      filingStatus: 'mfs',
      w2s: [{ ...w2(40_000), qualifiedTips: 5_000, qualifiedOvertime: 2_000 }],
    }));
    expect(r.schedule1A['13']).toBe(0);
    expect(r.schedule1A['21']).toBe(0);
  });
});

describe('SE health insurance and SEP / solo 401(k)', () => {
  it('deducts SE health insurance up to net profit after ½ SE tax', () => {
    const b = biz(57_500);
    b.seHealthInsurance = 6_000;
    const r = computeReturn(ret({ businesses: [b] }));
    expect(r.scheduleSE[0].lines['13']).toBe(4_063);
    expect(r.schedule1['17']).toBe(6_000);
    expect(r.form1040['11b']).toBe(57_500 - 4_063 - 6_000);
  });
  it('caps the sole-proprietor employer contribution at 20% of net SE after ½ SE tax', () => {
    const b = biz(57_500);
    b.sepOrSoloEmployer = 50_000;
    const r = computeReturn(ret({ businesses: [b] }));
    // 20% × (57,500 − 4,063) = 10,687
    expect(r.schedule1['16']).toBe(10_687);
  });
  it('blocks SE health insurance when the taxpayer is eligible for an employer plan', () => {
    const b = biz(57_500);
    b.seHealthInsurance = 6_000;
    const r = computeReturn(ret({ businesses: [b], coveredByEmployerHealthPlan: true }));
    expect(r.schedule1['17']).toBe(0);
  });
});

describe('Charitable AGI limits, mortgage cap, Form 4952', () => {
  it('limits cash gifts to 60% of AGI and carries the rest forward', () => {
    const r = computeReturn(ret({
      w2s: [w2(50_000)],
      itemized: { ...ret().itemized, charityCash: 40_000 },
      forceItemize: true,
    }));
    expect(r.scheduleA['11']).toBe(30_000);
    expect(r.charityCarryoverToNextYear).toBe(10_000);
  });
  it('limits non-cash gifts to 30% of AGI', () => {
    const r = computeReturn(ret({
      w2s: [w2(50_000)],
      itemized: { ...ret().itemized, charityNonCash: 20_000 },
      forceItemize: true,
    }));
    expect(r.scheduleA['12']).toBe(15_000);
    expect(r.charityCarryoverToNextYear).toBe(5_000);
  });
  it('limits mortgage interest by the $750,000 acquisition-debt cap', () => {
    const r = computeReturn(ret({
      w2s: [w2(80_000)],
      itemized: { ...ret().itemized, mortgageInterest1098: 30_000, mortgageAverageBalance: 1_000_000 },
    }));
    expect(r.scheduleA['8e']).toBe(22_500);
  });
  it('Form 4952 limits investment interest to net investment income', () => {
    const r = computeReturn(ret({
      w2s: [w2(80_000)],
      interest: [{ id: 'i', payer: 'Bank', taxable: 1_200, taxExempt: 0, federalWithholding: 0 }],
      itemized: { ...ret().itemized, investmentInterest: 5_000, mortgageInterest1098: 20_000 },
    }));
    expect(r.scheduleA['9']).toBe(1_200);
    expect(r.investmentInterestCarryoverToNextYear).toBe(3_800);
  });
});

describe('Form 2210 equal-installment regular method', () => {
  it('is zero when withholding plus estimates meet 90% of current-year tax', () => {
    const r = computeReturn(ret({ w2s: [w2(50_000, 6_000)], priorYearTax: 4_000, priorYearAgi: 48_000 }));
    expect(r.form2210['19']).toBe(0);
    expect(r.form1040['38']).toBe(0);
  });
  it('computes a penalty when prior-year tax is entered and payments are short', () => {
    const r = computeReturn(ret({ w2s: [w2(150_000, 5_000)], priorYearTax: 20_000, priorYearAgi: 140_000 }));
    expect(r.form1040['38']).toBeGreaterThan(0);
    expect(r.amountOwed).toBeGreaterThan(r.form1040['24'] - r.form1040['33']);
  });
});
