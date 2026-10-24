import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'test-data', 'cases');
mkdirSync(dir, { recursive: true });

const cases = [];
const add = (c) => cases.push(c);

// ---------- Filing status ----------
add({
  id: 'status-single-std',
  category: 'filing-status',
  description: 'Single filer, no income. Confirms the 2025 OBBBA standard deduction.',
  derivation: 'Form 1040 (2025) p. 2 margin and i1040gi Standard Deduction Chart: single $15,750. Taxable income $0; Tax Table tax $0.',
  input: { filingStatus: 'single' },
  expected: { standardDeduction: 15750, form1040: { 15: 0, 16: 0, 24: 0 }, refund: 0, amountOwed: 0 },
});
add({
  id: 'status-mfj-std',
  category: 'filing-status',
  description: 'Married filing jointly, no income.',
  derivation: 'Form 1040 (2025) standard deduction MFJ $31,500. TI $0, tax $0.',
  input: { filingStatus: 'mfj' },
  expected: { standardDeduction: 31500, form1040: { 15: 0, 16: 0 } },
});
add({
  id: 'status-mfs-std',
  category: 'filing-status',
  description: 'Married filing separately, no income.',
  derivation: 'Form 1040 (2025) standard deduction MFS $15,750 (same as single).',
  input: { filingStatus: 'mfs' },
  expected: { standardDeduction: 15750, form1040: { 15: 0, 16: 0 } },
});
add({
  id: 'status-hoh-std',
  category: 'filing-status',
  description: 'Head of household, no income.',
  derivation: 'Form 1040 (2025) standard deduction HOH $23,625.',
  input: { filingStatus: 'hoh', dependents: [{ firstName: 'Pat', under17: true, eicQualifying: true }] },
  expected: { standardDeduction: 23625, form1040: { 15: 0, 16: 0 } },
});
add({
  id: 'status-qss-std',
  category: 'filing-status',
  description: 'Qualifying surviving spouse, no income.',
  derivation: 'Form 1040 (2025) standard deduction QSS $31,500 (MFJ amount).',
  input: { filingStatus: 'qss', dependents: [{ firstName: 'Pat', under17: true, eicQualifying: true }] },
  expected: { standardDeduction: 31500, form1040: { 15: 0, 16: 0 } },
});

// ---------- Wages ----------
add({
  id: 'wages-single-50k',
  category: 'wages',
  description: 'Single employee, one W-2 of $50,000, $6,000 withheld. Classic refund.',
  derivation: 'TI = 50,000 − 15,750 = 34,250. Tax Table row $34,250–$34,300 midpoint $34,275: $1,192.50 + 12% × (34,275 − 11,925) = $3,874.50 → $3,875 (i1040gi Tax Table; RP 2024-40 § 3.01). Refund = 6,000 − 3,875 = $2,125. EIC completed-phaseout $19,104 (RP 2024-40 § 3.06) — no EIC.',
  input: { w2s: [{ wages: 50000, federalWithholding: 6000, socialSecurityWages: 50000, socialSecurityTax: 3100, medicareWages: 50000, medicareTax: 725 }] },
  expected: { form1040: { '1z': 50000, 15: 34250, 16: 3875, 24: 3875, '27a': 0, 34: 2125, 37: 0 }, taxMethod: 'table', refund: 2125, amountOwed: 0 },
});
add({
  id: 'wages-two-w2s',
  category: 'wages',
  description: 'Single filer with two W-2s ($30,000 and $20,000), same $50,000 wages as the one-job case.',
  derivation: 'Wages stack on line 1a/1z. TI and tax match wages-single-50k. Withholding $3,000 + $3,000 = $6,000 → refund $2,125.',
  input: { w2s: [
    { wages: 30000, federalWithholding: 3000, socialSecurityWages: 30000, socialSecurityTax: 1860, medicareWages: 30000, medicareTax: 435 },
    { wages: 20000, federalWithholding: 3000, socialSecurityWages: 20000, socialSecurityTax: 1240, medicareWages: 20000, medicareTax: 290 },
  ] },
  expected: { form1040: { '1z': 50000, 15: 34250, 16: 3875 }, refund: 2125 },
});
add({
  id: 'wages-two-earner-mfj',
  category: 'wages',
  description: 'Two-earner couple: taxpayer $60,000, spouse $40,000, MFJ.',
  derivation: 'Line 1z = $100,000. Std $31,500. TI = $68,500. Tax Table row $68,500–$68,550 midpoint $68,525: $2,385 + 12% × (68,525 − 23,850) = $2,385 + $5,361 = $7,746. No EIC (phaseout complete $26,214 joint / 0 children).',
  input: { filingStatus: 'mfj', w2s: [
    { owner: 'taxpayer', wages: 60000, federalWithholding: 5000, socialSecurityWages: 60000, socialSecurityTax: 3720, medicareWages: 60000, medicareTax: 870 },
    { owner: 'spouse', wages: 40000, federalWithholding: 3000, socialSecurityWages: 40000, socialSecurityTax: 2480, medicareWages: 40000, medicareTax: 580 },
  ] },
  expected: { form1040: { '1z': 100000, 15: 68500, 16: 7746, '27a': 0 }, taxMethod: 'table' },
});
add({
  id: 'wages-zero-income',
  category: 'wages',
  description: 'Empty return: no wages, no withholding, no dependents.',
  derivation: 'Every 1040 money line is $0. Engine must not produce NaN (Form 1040 lines 15/16/24/34/37).',
  input: {},
  expected: { form1040: { '1z': 0, 9: 0, '11b': 0, 15: 0, 16: 0, 24: 0, 34: 0, 37: 0 }, refund: 0, amountOwed: 0 },
});
add({
  id: 'wages-37-percent',
  category: 'wages',
  description: 'Single filer with $700,000 wages — 37% bracket, Tax Computation Worksheet.',
  derivation: 'TI = 700,000 − 15,750 = 684,250. Schedule tax (RP 2024-40 Table 3): $210,192.75. Tax Computation Worksheet (i1040gi p. 80) rounds to $210,193. Additional Medicare Tax: (700,000 − 200,000) × 0.9% = $4,500 (Form 8959 lines 6–7). Total tax = 210,193 + 4,500 = $214,693.',
  input: { w2s: [{ wages: 700000, federalWithholding: 180000, socialSecurityWages: 176100, socialSecurityTax: 10918, medicareWages: 700000, medicareTax: 14650 }] },
  expected: { form1040: { 15: 684250, 16: 210193, 23: 4500, 24: 214693 }, form8959: { 7: 4500 }, taxMethod: 'computation-worksheet' },
});
add({
  id: 'wages-addnl-medicare',
  category: 'wages',
  description: 'Single, $250,000 Medicare wages — Additional Medicare Tax exactly at $50,000 over the threshold.',
  derivation: 'Form 8959 (2025) line 5 threshold $200,000 single; line 7 = $50,000 × 0.9% = $450. Matching extra withholding on line 22 is also $450 and credits to 1040 line 25c.',
  input: { w2s: [{ wages: 250000, federalWithholding: 50000, socialSecurityWages: 176100, socialSecurityTax: 10918, medicareWages: 250000, medicareTax: 4075 }] },
  expected: { form8959: { 7: 450, 22: 450 }, form1040: { '25c': 450 }, schedule2: { 11: 450 } },
});
add({
  id: 'wages-niit',
  category: 'wages',
  description: 'Single, $190,000 wages plus $40,000 taxable interest — NIIT applies.',
  derivation: 'AGI $230,000. Form 8960: NII $40,000; MAGI over $200,000 = $30,000; tax = 3.8% × $30,000 = $1,140 (2025 Form 8960 instructions, line 14 threshold / line 17 rate).',
  input: {
    w2s: [{ wages: 190000, federalWithholding: 40000, socialSecurityWages: 176100, socialSecurityTax: 10918, medicareWages: 190000, medicareTax: 2755 }],
    interest: [{ payer: 'Bank', taxable: 40000 }],
  },
  expected: { form8960: { 16: 30000, 17: 1140 }, schedule2: { 12: 1140 } },
});
add({
  id: 'wages-spouse-ignored',
  category: 'wages',
  description: 'Single filer with a spouse-owned W-2 — ignored, with a warning.',
  derivation: 'Form 1040 is a single return; only the taxpayer’s items are included. Spouse W-2 $40,000 is dropped. Line 1z = $0.',
  input: { filingStatus: 'single', w2s: [{ owner: 'spouse', wages: 40000, federalWithholding: 4000, socialSecurityWages: 40000, medicareWages: 40000 }] },
  expected: { form1040: { '1z': 0, 15: 0 }, warningsIncludes: ['Spouse-owned'] },
});

// ---------- Investments / Schedule B / QDCG ----------
add({
  id: 'inv-schb-threshold',
  category: 'investments',
  description: 'Taxable interest $1,501 — Schedule B is required (over $1,500).',
  derivation: 'Schedule B (2025) Parts I/II notes and i1040gi lines 2b/3b: file Schedule B when taxable interest or ordinary dividends exceed $1,500. Line 2b = $1,501.',
  input: { w2s: [{ wages: 40000, federalWithholding: 4000, socialSecurityWages: 40000, medicareWages: 40000, medicareTax: 580 }], interest: [{ payer: 'Bank', taxable: 1501 }] },
  expected: { scheduleB: { 4: 1501 }, form1040: { '2b': 1501 }, warningsIncludes: ['Schedule B is required'] },
});
add({
  id: 'inv-tax-exempt',
  category: 'investments',
  description: 'Municipal-bond interest $2,000 reported on line 2a, not 2b.',
  derivation: 'Form 1040 line 2a is tax-exempt interest (1099-INT box 8). It is not in AGI. Line 2b = $0. TI = 40,000 − 15,750 = $24,250.',
  input: { w2s: [{ wages: 40000, federalWithholding: 4000, socialSecurityWages: 40000, medicareWages: 40000, medicareTax: 580 }], interest: [{ payer: 'Muni', taxable: 0, taxExempt: 2000 }] },
  expected: { form1040: { '2a': 2000, '2b': 0, '11b': 40000, 15: 24250 } },
});
add({
  id: 'inv-foreign-account',
  category: 'investments',
  description: 'Small interest plus a foreign financial account — Schedule B Part III yes.',
  derivation: 'Schedule B Part III: a foreign-account “yes” requires Schedule B even under the $1,500 threshold, and FBAR / Form 8938 may also be required (not prepared).',
  input: { interest: [{ payer: 'EU Bank', taxable: 200 }], foreignAccount: true },
  expected: { scheduleB: { 4: 200, '7a': 1 }, warningsIncludes: ['FinCEN 114'] },
});
add({
  id: 'inv-qd-0pct',
  category: 'investments',
  description: 'Single, $40,000 of qualified dividends and no other income — all inside the 0% CG band.',
  derivation: 'QDCG worksheet (i1040gi p. 38): line 1 = TI = 40,000 − 15,750 = 24,250; line 4 = 40,000; line 5 = 0; line 6 = $48,350 (RP 2024-40 § 3.03). All preferential income is taxed at 0%. Tax $0.',
  input: { dividends: [{ payer: 'Broker', ordinary: 40000, qualified: 40000 }] },
  expected: { form1040: { '3a': 40000, 15: 24250, 16: 0 }, taxMethod: 'qdcg-worksheet' },
});
add({
  id: 'inv-qd-15pct',
  category: 'investments',
  description: 'Single, $60,000 wages plus $20,000 qualified dividends — 15% band.',
  derivation: 'TI = 80,000 − 15,750 = 64,250. QDCG: ordinary TI = 44,250; 0% room = 48,350 − 44,250 = 4,100; 15% on 15,900 = $2,385. Ordinary tax on $44,250 (table row 44,250–44,300 mid 44,275): $1,192.50 + 12% × 32,350 = $5,074.50 → $5,075. Combined $7,460.',
  input: {
    w2s: [{ wages: 60000, federalWithholding: 8000, socialSecurityWages: 60000, medicareWages: 60000, medicareTax: 870 }],
    dividends: [{ payer: 'Broker', ordinary: 20000, qualified: 20000 }],
  },
  expected: { form1040: { 15: 64250 }, taxMethod: 'qdcg-worksheet' },
});
add({
  id: 'inv-qd-20pct',
  category: 'investments',
  description: 'Single, $600,000 wages plus $50,000 qualified dividends — 20% CG rate.',
  derivation: 'TI = 650,000 − 15,750 = 634,250. QDCG line 6 $48,350 and line 13 $533,400 (RP 2024-40 § 3.03). Ordinary TI = 584,250 is already above the 15% cap, so the entire $50,000 of QD is taxed at 20% = $10,000 plus regular tax on $584,250.',
  input: {
    w2s: [{ wages: 600000, federalWithholding: 160000, socialSecurityWages: 176100, medicareWages: 600000, medicareTax: 12300 }],
    dividends: [{ payer: 'Broker', ordinary: 50000, qualified: 50000 }],
  },
  expected: { form1040: { '3a': 50000, 15: 634250 }, taxMethod: 'qdcg-worksheet' },
});

// ---------- Schedule D ----------
add({
  id: 'schd-short-gain',
  category: 'schedule-d',
  description: 'Single wage earner sells stock held 4 months for a $3,000 short-term gain.',
  derivation: 'Form 8949 short-term: proceeds 8,000 − cost 5,000 = $3,000. Schedule D line 7 = $3,000; line 16 = $3,000; 1040 line 7 = $3,000. AGI = 63,000. No preferential rate (short-term). TI = 47,250.',
  input: {
    w2s: [{ wages: 60000, federalWithholding: 7000, socialSecurityWages: 60000, medicareWages: 60000, medicareTax: 870 }],
    capitalGains: [{ description: 'ST stock', term: 'short', proceeds: 8000, cost: 5000 }],
  },
  expected: { scheduleD: { 7: 3000, 16: 3000, 21: 3000 }, form1040: { 7: 3000, '11b': 63000, 15: 47250 } },
});
add({
  id: 'schd-long-and-qd',
  category: 'schedule-d',
  description: 'Long-term gain $5,000 plus $2,000 qualified dividends — QDCG worksheet.',
  derivation: 'Schedule D line 15 = $5,000; line 16 = $5,000. Preferential income for QDCG line 3/4 = 2,000 + 5,000 = $7,000. TI = 60,000 + 5,000 + 2,000 − 15,750 = $51,250.',
  input: {
    w2s: [{ wages: 60000, federalWithholding: 7000, socialSecurityWages: 60000, medicareWages: 60000, medicareTax: 870 }],
    dividends: [{ payer: 'Fund', ordinary: 2000, qualified: 2000 }],
    capitalGains: [{ description: 'LT stock', term: 'long', proceeds: 15000, cost: 10000 }],
  },
  expected: { scheduleD: { 15: 5000, 16: 5000 }, form1040: { 7: 5000, 15: 51250 }, taxMethod: 'qdcg-worksheet' },
});
add({
  id: 'schd-loss-limit',
  category: 'schedule-d',
  description: 'Net long-term capital loss of $9,000 — $3,000 allowed, $6,000 carries forward.',
  derivation: '§ 1211(b) / Schedule D (2025) line 21: net loss limited to $3,000 ($1,500 MFS). Carryover worksheet: unused $6,000 is long-term.',
  input: {
    w2s: [{ wages: 50000, federalWithholding: 5000, socialSecurityWages: 50000, medicareWages: 50000, medicareTax: 725 }],
    capitalGains: [{ description: 'Loss', term: 'long', proceeds: 1000, cost: 10000 }],
  },
  expected: { scheduleD: { 16: -9000, 21: -3000 }, form1040: { 7: -3000, 9: 47000 }, capitalLossCarryoverToNextYear: { st: 0, lt: 6000 } },
});
add({
  id: 'schd-loss-limit-mfs',
  category: 'schedule-d',
  description: 'MFS net short-term loss of $5,000 — $1,500 allowed.',
  derivation: '§ 1211(b) MFS cap $1,500. Carryover ST $3,500.',
  input: {
    filingStatus: 'mfs',
    w2s: [{ wages: 50000, federalWithholding: 5000, socialSecurityWages: 50000, medicareWages: 50000, medicareTax: 725 }],
    capitalGains: [{ description: 'Loss', term: 'short', proceeds: 0, cost: 5000 }],
  },
  expected: { form1040: { 7: -1500 }, scheduleD: { 21: -1500 } },
});
add({
  id: 'schd-collectibles-flagged',
  category: 'schedule-d',
  description: 'Long-term collectibles gain is included in Schedule D but the 28% worksheet is not computed.',
  derivation: 'Schedule D line 15 includes the $4,000 gain. Form 6251 / 28% Rate Gain Worksheet is unsupported — warning required. Gain still flows to line 7 and the 0/15/20% QDCG worksheet.',
  input: { capitalGains: [{ description: 'Gold coins', term: 'long', proceeds: 6000, cost: 2000, collectible: true }] },
  expected: { scheduleD: { 15: 4000, 21: 4000 }, warningsIncludes: ['Collectibles'] },
});

// ---------- Self-employment ----------
add({
  id: 'se-profit',
  category: 'self-employment',
  description: 'Single sole proprietor, $57,500 net profit, no wages.',
  derivation: 'Schedule SE (2025): 57,500 × 92.35% = $53,101; SS 12.4% = $6,585; Medicare 2.9% = $1,540; SE tax $8,125; deduction $4,063. Matches the published Schedule SE arithmetic used in the Rivera sample (spouse’s studio).',
  input: { businesses: [{ name: 'Studio', grossReceipts: 57500 }] },
  expected: { 'scheduleSE.0.lines': { 12: 8125, 13: 4063 }, schedule2: { 4: 8125 }, schedule1: { 15: 4063 } },
});
add({
  id: 'se-loss',
  category: 'self-employment',
  description: 'W-2 $60,000 plus a Schedule C loss of $10,000.',
  derivation: 'Sch. C line 31 = 5,000 − 15,000 = ($10,000). Sch. 1 line 3 = ($10,000). AGI = $50,000. Net earnings from SE are negative → no SE tax (Schedule SE line 4c < $400).',
  input: { w2s: [{ wages: 60000, federalWithholding: 6000, socialSecurityWages: 60000, medicareWages: 60000, medicareTax: 870 }], businesses: [{ grossReceipts: 5000, expenses: { otherExpenses: 15000 } }] },
  expected: { schedule1: { 3: -10000 }, schedule2: { 4: 0 }, form1040: { '11b': 50000, '13a': 0 } },
});
add({
  id: 'se-multiple-businesses',
  category: 'self-employment',
  description: 'Two Schedule C businesses, same owner, combined on one Schedule SE.',
  derivation: 'Profits $30,000 + $20,000 = $50,000. One Schedule SE. Combined net earnings 50,000 × 92.35% = $46,175. SS $5,726 + Medicare $1,339 = $7,065.',
  input: { businesses: [{ name: 'A', grossReceipts: 30000 }, { name: 'B', grossReceipts: 20000 }] },
  expected: { schedule2: { 4: 7065 } },
});
add({
  id: 'se-cogs-meals',
  category: 'self-employment',
  description: 'Retailer with inventory, COGS, and $1,001 of meals (50% deductible).',
  derivation: 'COGS = 5,000 + 20,000 + 3,000 + 1,000 + 500 − 4,500 = $25,000 (Sch. C lines 35–42). Meals 1,001 × 50% = $500.50 → $501 (§ 274(n); 2025 Sch. C instr. line 24b). Net profit $70,549 after $1,200 home office.',
  input: { businesses: [{
    name: 'Shop', grossReceipts: 100000, returnsAllowances: 2000, otherIncome: 250, hasInventory: true,
    cogs: { beginningInventory: 5000, purchases: 20000, costOfLabor: 3000, materialsSupplies: 1000, otherCosts: 500, endingInventory: 4500 },
    expenses: { mealsTotal: 1001, advertising: 1000 }, homeOffice: 1200,
  }] },
  expected: { 'scheduleC.0.lines': { 42: 25000, '24b': 501, 31: 70549 } },
});
add({
  id: 'se-under-400',
  category: 'self-employment',
  description: 'Tiny profit $400 — net earnings $369, under the $400 SE threshold.',
  derivation: 'Schedule SE line 4a = 400 × 92.35% = $369. Line 4c < $400 → no SE tax (Schedule SE 2025 line 4c / line 12).',
  input: { businesses: [{ grossReceipts: 400 }] },
  expected: { schedule2: { 4: 0 }, schedule1: { 15: 0 } },
});
add({
  id: 'se-wage-base',
  category: 'self-employment',
  description: 'W-2 social security wages $170,000 plus $50,000 of SE profit — remaining wage base $6,100.',
  derivation: 'SE net earnings = 50,000 × 92.35% = $46,175. Remaining SS base = 176,100 − 170,000 = $6,100 (RP 2024-40 / Sch. SE line 7). SS portion 6,100 × 12.4% = $756; Medicare 46,175 × 2.9% = $1,339; SE tax $2,095.',
  input: { w2s: [{ wages: 170000, federalWithholding: 30000, socialSecurityWages: 170000, socialSecurityTax: 10540, medicareWages: 170000, medicareTax: 2465 }], businesses: [{ grossReceipts: 50000 }] },
  expected: { 'scheduleSE.0.lines': { 9: 6100, 10: 756, 11: 1339, 12: 2095 } },
});
add({
  id: 'se-health-and-sep',
  category: 'self-employment',
  description: 'Studio profit $57,500; $6,000 SE health insurance and a requested $50,000 SEP.',
  derivation: '½ SE tax = $4,063. Employer SEP cap = 20% × (57,500 − 4,063) = $10,687 (Pub. 560; Notice 2024-80 $70,000 overall). Health $6,000 is under the remaining profit. AGI = 57,500 − 4,063 − 10,687 − 6,000 = $36,750.',
  input: { businesses: [{ grossReceipts: 57500, seHealthInsurance: 6000, sepOrSoloEmployer: 50000 }] },
  expected: { schedule1: { 15: 4063, 16: 10687, 17: 6000 }, form1040: { '11b': 36750 } },
});
add({
  id: 'se-employer-plan-blocks-health',
  category: 'self-employment',
  description: 'Same studio, but the taxpayer could have enrolled in an employer plan.',
  derivation: 'Pub. 535: SE health insurance is not deductible if eligible for an employer-sponsored plan. Line 17 = $0. SEP still allowed.',
  input: { coveredByEmployerHealthPlan: true, businesses: [{ grossReceipts: 57500, seHealthInsurance: 6000, sepOrSoloEmployer: 50000 }] },
  expected: { schedule1: { 17: 0, 16: 10687 } },
});

// ---------- QBI ----------
add({
  id: 'qbi-below-threshold',
  category: 'qbi',
  description: 'Single, $20,000 Schedule C profit plus $10,000 of qualified dividends — QBI limited by 20% of ordinary TI.',
  derivation: 'SE tax $2,826, deduction $1,413. AGI = 20,000 + 10,000 − 1,413 = $28,587. Form 8995 line 11 = 28,587 − 15,750 = $12,837; line 13 = $2,837; line 14 = $567. QBI component 18,587 × 20% = $3,717. Deduction = $567 (Form 8995 lines 5/14/15).',
  input: { businesses: [{ grossReceipts: 20000 }], dividends: [{ ordinary: 10000, qualified: 10000 }] },
  expected: { form8995: { 5: 3717, 11: 12837, 14: 567, 15: 567 }, form1040: { '13a': 567 } },
});
add({
  id: 'qbi-at-mfj-threshold',
  category: 'qbi',
  description: 'MFJ wages $250,000 plus $100,000 profit — still under the $394,600 Form 8995 threshold.',
  derivation: 'Form 8995 (2025) header / RP 2024-40 § 3.27: MFJ threshold $394,600. Line 11 is under that amount, so the simplified 20% deduction applies (no W-2/UBIA limit).',
  input: { filingStatus: 'mfj', w2s: [{ wages: 250000, federalWithholding: 50000, socialSecurityWages: 176100, medicareWages: 250000, medicareTax: 4075 }], businesses: [{ grossReceipts: 100000 }] },
  expected: { form1040: { '13a': 'GT0' } },
});
add({
  id: 'qbi-above-with-wages',
  category: 'qbi',
  description: 'Single Schedule C: $380,000 receipts, $80,000 W-2 wages paid, $200,000 UBIA — Form 8995-A wage limit.',
  derivation: 'Profit $300,000. ½ SE tax $14,935. QBI $285,065; 20% = $57,013. Greater of 50% × 80,000 = $40,000 or 25% × 80,000 + 2.5% × 200,000 = $25,000 → $40,000. TI before QBI $269,315 > $247,300, so the full W-2/UBIA limit applies (Form 8995-A lines 4–12; § 199A(b)(2)). Deduction $40,000.',
  input: { businesses: [{ grossReceipts: 380000, expenses: { wages: 80000 }, ubia: 200000 }] },
  expected: { form1040: { '13a': 40000 } },
});
add({
  id: 'qbi-sstb-above-range',
  category: 'qbi',
  description: 'Same profit as qbi-above-with-wages but the trade is an SSTB — fully excluded.',
  derivation: 'Form 8995-A instructions: an SSTB is not a qualified trade or business once taxable income exceeds the threshold plus the $50,000 phase-in range ($247,300 single). QBI deduction $0.',
  input: { businesses: [{ grossReceipts: 380000, expenses: { wages: 80000 }, ubia: 200000, isSstb: true }] },
  expected: { form1040: { '13a': 0 } },
});
add({
  id: 'qbi-sstb-phase-in',
  category: 'qbi',
  description: 'SSTB consultant with $220,000 of W-2 wages and $40,000 profit — inside the 2025 phase-in range.',
  derivation: '½ SE tax $2,826. AGI $257,174. TI before QBI = 257,174 − 15,750 = $241,424, which is between $197,300 and $247,300. Applicable SSTB percentage = 1 − (241,424 − 197,300)/50,000 = 11.752%. A reduced (not zero) QBI deduction remains.',
  input: { w2s: [{ wages: 220000, federalWithholding: 45000, socialSecurityWages: 176100, medicareWages: 220000, medicareTax: 3370 }], businesses: [{ grossReceipts: 40000, isSstb: true }] },
  expected: { form1040: { '13a': 'GT0' } },
});

// ---------- Itemized / SALT / medical / charity / mortgage / 4952 ----------
add({
  id: 'item-salt-cap',
  category: 'itemized',
  description: 'Single, $100,000 wages, $45,000 of SALT — capped at $40,000.',
  derivation: 'Schedule A (2025) line 5e / State and Local Tax Deduction Worksheet: $40,000 cap [OBBBA § 70120] applies at or below $500,000 MAGI. 5d = $45,000 → 5e = $40,000.',
  input: { w2s: [{ wages: 100000, federalWithholding: 18000, socialSecurityWages: 100000, medicareWages: 100000, medicareTax: 1450 }], itemized: { stateLocalIncomeOrSalesTax: 30000, realEstateTax: 15000 } },
  expected: { scheduleA: { '5d': 45000, '5e': 40000 } },
});
add({
  id: 'item-salt-phasedown',
  category: 'itemized',
  description: 'Single, AGI $550,000, $50,000 SALT — 30% phase-down.',
  derivation: 'Worksheet: $40,000 − 30% × ($550,000 − $500,000) = $40,000 − $15,000 = $25,000 (Schedule A instr. p. 7).',
  input: { w2s: [{ wages: 550000, federalWithholding: 140000, socialSecurityWages: 176100, medicareWages: 550000, medicareTax: 11125 }], itemized: { stateLocalIncomeOrSalesTax: 50000 } },
  expected: { scheduleA: { '5e': 25000 } },
});
add({
  id: 'item-salt-floor',
  category: 'itemized',
  description: 'Single, AGI $800,000 — SALT phase-down floors at $10,000.',
  derivation: '40,000 − 30% × 300,000 = negative; larger of that or $10,000 = $10,000 (worksheet line 9).',
  input: { w2s: [{ wages: 800000, federalWithholding: 220000, socialSecurityWages: 176100, medicareWages: 800000, medicareTax: 17000 }], itemized: { stateLocalIncomeOrSalesTax: 60000 } },
  expected: { scheduleA: { '5e': 10000 } },
});
add({
  id: 'item-salt-mfs-half',
  category: 'itemized',
  description: 'MFS, AGI $300,000, $30,000 SALT — worksheet halves line 9.',
  derivation: '40,000 − 30% × (300,000 − 250,000) = $25,000; half if MFS = $12,500 (Schedule A instr. worksheet line 10).',
  input: { filingStatus: 'mfs', w2s: [{ wages: 300000, federalWithholding: 70000, socialSecurityWages: 176100, medicareWages: 300000, medicareTax: 5250 }], itemized: { stateLocalIncomeOrSalesTax: 30000 } },
  expected: { scheduleA: { '5e': 12500 } },
});
add({
  id: 'item-medical-floor',
  category: 'itemized',
  description: 'AGI $80,000, medical $10,000 — only the excess over 7.5% counts.',
  derivation: 'Schedule A (2025) line 3: 7.5% × 80,000 = $6,000. Line 4 = $4,000.',
  input: { w2s: [{ wages: 80000, federalWithholding: 10000, socialSecurityWages: 80000, medicareWages: 80000, medicareTax: 1160 }], itemized: { medical: 10000 } },
  expected: { scheduleA: { 3: 6000, 4: 4000 } },
});
add({
  id: 'item-vs-standard',
  category: 'itemized',
  description: 'Mortgage interest $8,000 is smaller than the $15,750 standard deduction, so standard is used unless elected.',
  derivation: 'Form 1040 line 12e takes the larger of standard and itemized. $8,000 < $15,750 → standard. forceItemize is off.',
  input: { w2s: [{ wages: 70000, federalWithholding: 8000, socialSecurityWages: 70000, medicareWages: 70000, medicareTax: 1015 }], itemized: { mortgageInterest1098: 8000 } },
  expected: { usesItemized: false, form1040: { '12e': 15750 } },
});
add({
  id: 'item-charity-60pct',
  category: 'itemized',
  description: 'Cash gifts $40,000 on AGI $50,000 — 60% AGI limit, $10,000 carryover.',
  derivation: '§ 170(b)(1)(G) / Pub. 526: cash to a 50%-limit charity is capped at 60% of AGI = $30,000. Unused $10,000 carries forward up to five years.',
  input: { w2s: [{ wages: 50000, federalWithholding: 4000, socialSecurityWages: 50000, medicareWages: 50000, medicareTax: 725 }], itemized: { charityCash: 40000 }, forceItemize: true },
  expected: { scheduleA: { 11: 30000 }, charityCarryoverToNextYear: 10000 },
});
add({
  id: 'item-charity-30pct-noncash',
  category: 'itemized',
  description: 'Non-cash gifts $20,000 on AGI $50,000 — 30% AGI limit.',
  derivation: 'Pub. 526: capital-gain / non-cash property to a public charity is capped at 30% of AGI = $15,000. Carryover $5,000.',
  input: { w2s: [{ wages: 50000, federalWithholding: 4000, socialSecurityWages: 50000, medicareWages: 50000, medicareTax: 725 }], itemized: { charityNonCash: 20000 }, forceItemize: true },
  expected: { scheduleA: { 12: 15000 }, charityCarryoverToNextYear: 5000 },
});
add({
  id: 'item-mortgage-750k',
  category: 'itemized',
  description: 'Average acquisition debt $1,000,000, interest $30,000 — limited to the $750,000 cap.',
  derivation: 'Pub. 936 / § 163(h)(3)(F): deductible interest = 30,000 × 750,000 / 1,000,000 = $22,500. Pre-15 Dec 2017 $1,000,000 grandfathering is not applied (documented simplification).',
  input: { w2s: [{ wages: 80000, federalWithholding: 10000, socialSecurityWages: 80000, medicareWages: 80000, medicareTax: 1160 }], itemized: { mortgageInterest1098: 30000, mortgageAverageBalance: 1000000 } },
  expected: { scheduleA: { '8e': 22500 } },
});
add({
  id: 'item-4952',
  category: 'itemized',
  description: 'Investment interest $5,000, taxable interest income $1,200 — Form 4952 limit.',
  derivation: 'Form 4952: net investment income = $1,200 (qualified dividends and LTCG excluded; no line-4g election). Deductible $1,200; carryover $3,800.',
  input: {
    w2s: [{ wages: 80000, federalWithholding: 10000, socialSecurityWages: 80000, medicareWages: 80000, medicareTax: 1160 }],
    interest: [{ payer: 'Bank', taxable: 1200 }],
    itemized: { investmentInterest: 5000, mortgageInterest1098: 20000 },
  },
  expected: { scheduleA: { 9: 1200 }, form4952: { 8: 1200 }, investmentInterestCarryoverToNextYear: 3800 },
});

// ---------- Credits ----------
add({
  id: 'ctc-two-kids-mfj',
  category: 'credits',
  description: 'MFJ, $150,000 wages, two qualifying children and one other dependent.',
  derivation: 'Schedule 8812 (2025): 2 × $2,200 + 1 × $500 = $4,900 (lines 5, 7, 8). MAGI under $400,000 → no phase-out. Nonrefundable credit limited by tax; here tax > $4,900 so line 19 = $4,900.',
  input: { filingStatus: 'mfj', w2s: [{ wages: 150000, federalWithholding: 18000, socialSecurityWages: 150000, medicareWages: 150000, medicareTax: 2175 }], dependents: [{ firstName: 'A', under17: true, eicQualifying: true }, { firstName: 'B', under17: true, eicQualifying: true }, { firstName: 'C', under17: false, eicQualifying: false }] },
  expected: { schedule8812: { 5: 4400, 7: 500 }, form1040: { 19: 4900 } },
});
add({
  id: 'ctc-phaseout',
  category: 'credits',
  description: 'MFJ AGI $412,500, one qualifying child — phase-out rounds up to the next $1,000.',
  derivation: 'Schedule 8812 lines 9–11: excess $12,500 → rounded up to $13,000 × 5% = $650. Credit 2,200 − 650 = $1,550.',
  input: { filingStatus: 'mfj', w2s: [{ wages: 412500, federalWithholding: 80000, socialSecurityWages: 176100, medicareWages: 412500, medicareTax: 7891 }], dependents: [{ firstName: 'A', under17: true, eicQualifying: true }] },
  expected: { schedule8812: { 10: 13000, 11: 650, 12: 1550 } },
});
add({
  id: 'ctc-actc-hoh',
  category: 'credits',
  description: 'HOH, two children, $30,000 wages — nonrefundable CTC plus $3,400 ACTC and EIC.',
  derivation: 'Std $23,625. TI $6,375 → Tax Table $638. Nonrefundable CTC $638. ACTC = min(unused, 2 × $1,700, 15% × $27,500) = $3,400 (Sch. 8812 Part II-A). EIC (2 children, other statuses): max $7,152 − 21.06% × ($30,000 − $23,350) = $7,152 − $1,400 = $5,752 (RP 2024-40 § 3.06).',
  input: { filingStatus: 'hoh', w2s: [{ wages: 30000, federalWithholding: 1000, socialSecurityWages: 30000, socialSecurityTax: 1860, medicareWages: 30000, medicareTax: 435 }], dependents: [{ firstName: 'A', under17: true, eicQualifying: true }, { firstName: 'B', under17: true, eicQualifying: true }] },
  expected: { form1040: { 16: 638, 19: 638, 28: 3400, '27a': 5752 }, refund: 10152 },
});
add({
  id: 'ctc-three-kids-part2b',
  category: 'credits',
  description: 'MFJ, three qualifying children, only $4,000 of wages — Part II-B ACTC, reduced by EIC.',
  derivation: 'Line 20 = 15% × $1,500 = $225. Line 21 withheld SS/Medicare = $248 + $58 = $306. EIC = 45% × $4,000 = $1,800 (3+ children, under the $17,880 earned-income amount). Line 25 = pos(306 − 1,800) = 0. ACTC = min($5,100 unused, max(225, 0)) = $225.',
  input: { filingStatus: 'mfj', w2s: [{ wages: 4000, socialSecurityWages: 4000, socialSecurityTax: 248, medicareWages: 4000, medicareTax: 58 }], dependents: [{ firstName: 'A', under17: true, eicQualifying: true }, { firstName: 'B', under17: true, eicQualifying: true }, { firstName: 'C', under17: true, eicQualifying: true }] },
  expected: { schedule8812: { 20: 225, 21: 306, 24: 1800 }, form1040: { 28: 225, '27a': 1800 } },
});
add({
  id: 'eic-one-child-max',
  category: 'credits',
  description: 'HOH, one qualifying child, earned income exactly $12,730 — maximum EIC.',
  derivation: 'RP 2024-40 § 3.06: earned-income amount $12,730, maximum credit $4,328, phase-out starts $23,350 (other statuses). No phase-out. Credit $4,328.',
  input: { filingStatus: 'hoh', w2s: [{ wages: 12730, socialSecurityWages: 12730, medicareWages: 12730, medicareTax: 185 }], dependents: [{ firstName: 'A', under17: true, eicQualifying: true }] },
  expected: { form1040: { '27a': 4328 } },
});
add({
  id: 'eic-childless',
  category: 'credits',
  description: 'Single, no children, $8,000 wages — childless EIC.',
  derivation: '7.65% × $8,000 = $612, under the $649 maximum (RP 2024-40 § 3.06, 0 children).',
  input: { w2s: [{ wages: 8000, socialSecurityWages: 8000, medicareWages: 8000, medicareTax: 116 }] },
  expected: { form1040: { '27a': 612 } },
});
add({
  id: 'eic-investment-limit',
  category: 'credits',
  description: 'Otherwise-eligible parent with $12,000 of taxable interest — EIC disallowed.',
  derivation: 'RP 2024-40 § 3.06(2): EIC is not allowed if investment income exceeds $11,950.',
  input: { w2s: [{ wages: 10000, socialSecurityWages: 10000, medicareWages: 10000, medicareTax: 145 }], dependents: [{ firstName: 'A', under17: true, eicQualifying: true }], interest: [{ payer: 'Bank', taxable: 12000 }] },
  expected: { form1040: { '27a': 0 } },
});

// ---------- Seniors / dependent filer ----------
add({
  id: 'senior-single-65',
  category: 'seniors',
  description: 'Single, born before January 2, 1961, $50,000 wages.',
  derivation: 'Additional standard deduction $2,000 (RP 2024-40 § 3.15(3); i1040gi p. 35) → std $17,750. Enhanced senior deduction $6,000 (Sch. 1-A Part V; MAGI under $75,000). TI = 50,000 − 17,750 − 6,000 = $26,250.',
  input: { taxpayer: { bornBefore1961: true }, w2s: [{ wages: 50000, federalWithholding: 4000, socialSecurityWages: 50000, medicareWages: 50000, medicareTax: 725 }] },
  expected: { standardDeduction: 17750, form1040: { '13b': 6000, 15: 26250 } },
});
add({
  id: 'senior-blind',
  category: 'seniors',
  description: 'Single, 65 and blind.',
  derivation: 'Two additional-standard-deduction boxes × $2,000 = $4,000. Std = 15,750 + 4,000 = $19,750.',
  input: { taxpayer: { bornBefore1961: true, blind: true } },
  expected: { standardDeduction: 19750 },
});
add({
  id: 'senior-mfj-both',
  category: 'seniors',
  description: 'MFJ, both 65+, AGI $100,000 — $12,000 senior deduction.',
  derivation: 'Sch. 1-A lines 36a/36b: $6,000 each because MAGI $100,000 ≤ $150,000. Std = 31,500 + 2 × $1,600 = $34,700? Wait: only age boxes, not blind: 31,500 + 1,600 + 1,600 = $34,700. Actually additional is $1,600 per box if married (RP 2024-40 § 3.15(3)). 31,500 + 3,200 = $34,700.',
  input: { filingStatus: 'mfj', taxpayer: { bornBefore1961: true }, spouse: { bornBefore1961: true }, w2s: [{ wages: 100000, federalWithholding: 10000, socialSecurityWages: 100000, medicareWages: 100000, medicareTax: 1450 }] },
  expected: { standardDeduction: 34700, form1040: { '13b': 12000 } },
});
add({
  id: 'senior-mfs-blocked',
  category: 'seniors',
  description: 'MFS and 65+ — extra standard deduction applies, enhanced senior deduction does not.',
  derivation: 'Sch. 1-A caution: married individuals must file jointly for the $6,000 senior deduction. Additional std $1,600 → $17,350.',
  input: { filingStatus: 'mfs', taxpayer: { bornBefore1961: true }, w2s: [{ wages: 50000, socialSecurityWages: 50000, medicareWages: 50000, medicareTax: 725 }] },
  expected: { standardDeduction: 17350, form1040: { '13b': 0 } },
});
add({
  id: 'dependent-filer-min',
  category: 'seniors',
  description: 'Dependent filer with $500 of wages — $1,350 standard deduction floor.',
  derivation: 'i1040gi p. 35 dependents worksheet: greater of $1,350 or earned income + $450, capped at the basic standard deduction. $500 + $450 = $950 → floor $1,350.',
  input: { canBeClaimedAsDependent: true, w2s: [{ wages: 500, socialSecurityWages: 500, medicareWages: 500, medicareTax: 7 }] },
  expected: { standardDeduction: 1350 },
});
add({
  id: 'dependent-filer-earned',
  category: 'seniors',
  description: 'Dependent filer with $5,000 of wages — earned income + $450.',
  derivation: 'Worksheet line 2: 5,000 + 450 = $5,450, under the $15,750 cap.',
  input: { canBeClaimedAsDependent: true, w2s: [{ wages: 5000, socialSecurityWages: 5000, medicareWages: 5000, medicareTax: 73 }] },
  expected: { standardDeduction: 5450 },
});
add({
  id: 'senior-deduction-phaseout',
  category: 'seniors',
  description: 'Single, 65+, MAGI $95,000 — 6% phase-down of the $6,000 senior deduction.',
  derivation: 'Sch. 1-A lines 33–35: excess $20,000 × 6% = $1,200; $6,000 − $1,200 = $4,800. Std $17,750. TI = 95,000 − 17,750 − 4,800 = $72,450.',
  input: { taxpayer: { bornBefore1961: true }, w2s: [{ wages: 95000, federalWithholding: 12000, socialSecurityWages: 95000, medicareWages: 95000, medicareTax: 1378 }] },
  expected: { schedule1A: { 35: 4800 }, form1040: { '13b': 4800, 15: 72450 } },
});

// ---------- Schedule 1-A tips / OT / car ----------
add({
  id: 's1a-tips',
  category: 'schedule-1a',
  description: 'Server with $40,000 wages including $8,000 of qualified tips.',
  derivation: 'Sch. 1-A Part II: qualified tips $8,000 ≤ $25,000 cap; MAGI $40,000 ≤ $150,000 → full $8,000 deduction (lines 7, 13). TI = 40,000 − 15,750 − 8,000 = $16,250.',
  input: { w2s: [{ wages: 40000, federalWithholding: 2000, socialSecurityWages: 40000, medicareWages: 40000, medicareTax: 580, qualifiedTips: 8000 }] },
  expected: { schedule1A: { 13: 8000 }, form1040: { '13b': 8000, 15: 16250 } },
});
add({
  id: 's1a-tips-phaseout',
  category: 'schedule-1a',
  description: 'Qualified tips $10,000, MAGI $152,400 — $100-per-$1,000 floor phase-out.',
  derivation: 'Sch. 1-A lines 10–13: excess $2,400; floor(2,400/1,000) = 2 × $100 = $200; deduction $9,800. (Tips use the floor; car-loan interest uses the ceiling.)',
  input: { w2s: [{ wages: 152400, federalWithholding: 28000, socialSecurityWages: 152400, medicareWages: 152400, medicareTax: 2210, qualifiedTips: 10000 }] },
  expected: { schedule1A: { 11: 2, 13: 9800 } },
});
add({
  id: 's1a-overtime',
  category: 'schedule-1a',
  description: 'Single filer with $20,000 of qualified overtime — capped at $12,500.',
  derivation: 'Sch. 1-A line 15: smaller of qualified OT or $12,500 ($25,000 MFJ). MAGI $50,000, no phase-out. Deduction $12,500.',
  input: { w2s: [{ wages: 50000, federalWithholding: 5000, socialSecurityWages: 50000, medicareWages: 50000, medicareTax: 725, qualifiedOvertime: 20000 }] },
  expected: { schedule1A: { 15: 12500, 21: 12500 } },
});
add({
  id: 's1a-overtime-mfj-cap',
  category: 'schedule-1a',
  description: 'MFJ, $20,000 qualified overtime — under the $25,000 joint cap.',
  derivation: 'Line 15 uses the $25,000 MFJ cap, so the full $20,000 is allowed (MAGI $50,000).',
  input: { filingStatus: 'mfj', w2s: [{ wages: 50000, federalWithholding: 4000, socialSecurityWages: 50000, medicareWages: 50000, medicareTax: 725, qualifiedOvertime: 20000 }] },
  expected: { schedule1A: { 21: 20000 } },
});
add({
  id: 's1a-car-loan',
  category: 'schedule-1a',
  description: 'MAGI just over $100,000 and $3,000 of qualified car-loan interest — ceiling phase-out.',
  derivation: 'Sch. 1-A lines 26–30: excess $100; ceil(100/1,000) = 1 × $200 = $200; deduction $2,800. Cap is $10,000; start is $100,000 ($200,000 MFJ).',
  input: { w2s: [{ wages: 100100, federalWithholding: 18000, socialSecurityWages: 100100, medicareWages: 100100, medicareTax: 1451 }], carLoanInterest: 3000 },
  expected: { schedule1A: { 28: 1, 30: 2800 } },
});
add({
  id: 's1a-mfs-tips-blocked',
  category: 'schedule-1a',
  description: 'MFS with qualified tips and overtime — both require a joint return.',
  derivation: 'Sch. 1-A Parts II and III cautions: if married, you must file jointly. Car-loan interest (Part IV) remains available.',
  input: { filingStatus: 'mfs', w2s: [{ wages: 40000, socialSecurityWages: 40000, medicareWages: 40000, medicareTax: 580, qualifiedTips: 5000, qualifiedOvertime: 2000 }], carLoanInterest: 1000 },
  expected: { schedule1A: { 13: 0, 21: 0, 30: 1000 } },
});

// ---------- AMT ----------
add({
  id: 'amt-salt-no-amt',
  category: 'amt',
  description: 'High-SALT itemizer ($40,000 SALT on $400,000 AGI) — AMTI is computed, but TMT is under regular tax.',
  derivation: 'Form 6251: line 1b = TI $340,000; line 2a = Sch. A taxes $40,000; AMTI $380,000; exemption $88,100 (RP 2024-40 § 3.11 / Form 6251 line 5). Line 6 = $291,900. 28% × 291,900 − $4,782 = $76,950 < regular tax $88,547 → AMT $0. Demonstrates the $40,000 SALT addback.',
  input: { w2s: [{ wages: 400000, federalWithholding: 90000, socialSecurityWages: 176100, medicareWages: 400000, medicareTax: 7600 }], itemized: { stateLocalIncomeOrSalesTax: 40000, mortgageInterest1098: 20000 } },
  expected: { form6251: { '2a': 40000, 4: 380000, 5: 88100, 11: 0 }, scheduleA: { '5e': 40000 } },
});
add({
  id: 'amt-senior-addback',
  category: 'amt',
  description: 'Single senior with $50,000 wages — Form 6251 line 1b adds back the $6,000 senior deduction.',
  derivation: 'Form 6251 (2025) What’s New / lines 1a–1b: the enhanced senior deduction is a personal-exemption-type addback (§ 56(b)(5)(D)). Line 1b = TI $26,250 + $6,000 = $32,250.',
  input: { taxpayer: { bornBefore1961: true }, w2s: [{ wages: 50000, federalWithholding: 4000, socialSecurityWages: 50000, medicareWages: 50000, medicareTax: 725 }] },
  expected: { form1040: { '13b': 6000, 15: 26250 }, form6251: { '1b': 32250 } },
});

// ---------- 2210 / refund vs owe / boundaries ----------
add({
  id: 'pay-balance-due',
  category: 'payments',
  description: 'Single, $150,000 wages, $20,000 withheld — balance due, no 2210 because prior-year tax was not entered.',
  derivation: 'TI $134,250. Tax Computation Worksheet: 134,250 × 24% − $7,153 = $25,067. Owed $5,067. Form 2210 is computed only when 2024 tax is entered (otherwise the IRS bills any penalty).',
  input: { w2s: [{ wages: 150000, federalWithholding: 20000, socialSecurityWages: 150000, medicareWages: 150000, medicareTax: 2175 }] },
  expected: { form1040: { 16: 25067, 37: 5067, 38: 0 }, amountOwed: 5067, refund: 0, taxMethod: 'computation-worksheet' },
});
add({
  id: 'pay-2210-penalty',
  category: 'payments',
  description: 'Same $150,000 wage return with last year’s tax entered and only $5,000 withheld — Form 2210 penalty applies.',
  derivation: 'Required annual payment = lesser of 90% of 2025 tax or 100% of 2024 tax $20,000 (AGI last year $140,000, not high-income). Payments $5,000 < required. Equal-installment regular method at 7% (2025 Form 2210; quarterly rates all 7%). Line 38 > 0 and is added to the amount owed.',
  input: { w2s: [{ wages: 150000, federalWithholding: 5000, socialSecurityWages: 150000, medicareWages: 150000, medicareTax: 2175 }], priorYearTax: 20000, priorYearAgi: 140000 },
  expected: { form1040: { 38: 'GT0' } },
});
add({
  id: 'pay-refund',
  category: 'payments',
  description: 'Single $50,000 / $6,000 withheld — refund (companion to wages-single-50k).',
  derivation: 'See wages-single-50k. Line 34 = line 35a = $2,125. Line 37 = $0.',
  input: { w2s: [{ wages: 50000, federalWithholding: 6000, socialSecurityWages: 50000, medicareWages: 50000, medicareTax: 725 }] },
  expected: { refund: 2125, amountOwed: 0, form1040: { 34: 2125, 37: 0 } },
});
add({
  id: 'bound-tax-table-top',
  category: 'boundaries',
  description: 'Taxable income $99,999 — last Tax Table row; $100,000 would switch methods.',
  derivation: 'i1040gi line 16: taxable income under $100,000 must use the Tax Table. $100,000 uses the Tax Computation Worksheet. Here wages $115,749 − $15,750 = $99,999.',
  input: { w2s: [{ wages: 115749, federalWithholding: 20000, socialSecurityWages: 115749, medicareWages: 115749, medicareTax: 1678 }] },
  expected: { form1040: { 15: 99999 }, taxMethod: 'table' },
});
add({
  id: 'bound-computation-worksheet',
  category: 'boundaries',
  description: 'Taxable income exactly $100,000 — Tax Computation Worksheet.',
  derivation: 'Wages $115,750 − $15,750 = $100,000. Worksheet: 100,000 × 22% − $5,086 = $16,914 (i1040gi p. 80, single 22% row).',
  input: { w2s: [{ wages: 115750, federalWithholding: 20000, socialSecurityWages: 115750, medicareWages: 115750, medicareTax: 1678 }] },
  expected: { form1040: { 15: 100000, 16: 16914 }, taxMethod: 'computation-worksheet' },
});
add({
  id: 'bound-ctc-phaseout-edge',
  category: 'boundaries',
  description: 'MFJ MAGI exactly $400,000, one child — no CTC phase-out. One dollar more would start it.',
  derivation: 'Schedule 8812 line 9 = $400,000 MFJ. Excess $0 → line 10 = $0. Full $2,200.',
  input: { filingStatus: 'mfj', w2s: [{ wages: 400000, federalWithholding: 80000, socialSecurityWages: 176100, medicareWages: 400000, medicareTax: 7600 }], dependents: [{ firstName: 'A', under17: true, eicQualifying: true }] },
  expected: { schedule8812: { 10: 0, 12: 2200 } },
});
add({
  id: 'bound-12-to-22-single',
  category: 'boundaries',
  description: 'Single taxable income just into the 22% bracket ($48,476).',
  derivation: 'RP 2024-40 Table 3: 12% ends at $48,475. Wages 48,476 + 15,750 = $64,226 → TI $48,476. Tax Table (under $100,000) still applies; the 22% marginal rate begins here.',
  input: { w2s: [{ wages: 64226, federalWithholding: 8000, socialSecurityWages: 64226, medicareWages: 64226, medicareTax: 931 }] },
  expected: { form1040: { 15: 48476 }, taxMethod: 'table' },
});

// ---------- Family scenarios ----------
add({
  id: 'family-rivera-sample',
  category: 'family',
  description: 'The Rivera household: MFJ, two children, one W-2, interest and dividends, spouse’s design studio, itemized deductions, $6,000 of estimates.',
  derivation: 'Hand-checked in tests/engine/return.test.ts against 2025 forms: Sch. C $57,500; AGI $155,987; itemized $35,000; QBI $10,687; TI $110,300; QDCG tax $13,940; CTC $4,400; SE tax $8,125; total tax $17,665; payments $15,800; owed $1,865. MAGI is far above the EIC phase-out. AMT TMT is under regular tax (SALT addback $17,300).',
  input: {
    filingStatus: 'mfj',
    taxpayer: { firstName: 'Alex', lastName: 'Rivera' },
    spouse: { firstName: 'Jordan', lastName: 'Rivera' },
    dependents: [
      { firstName: 'Sam', relationship: 'Son', under17: true, eicQualifying: true },
      { firstName: 'Riley', relationship: 'Daughter', under17: true, eicQualifying: true },
    ],
    w2s: [{ employer: 'Northwind Logistics', wages: 98000, federalWithholding: 9800, socialSecurityWages: 98000, socialSecurityTax: 6076, medicareWages: 98000, medicareTax: 1421 }],
    interest: [{ payer: 'Prairie Savings Bank', taxable: 1850 }, { payer: 'City Muni Bond Fund', taxExempt: 400 }],
    dividends: [{ payer: 'Lakeshore Brokerage', ordinary: 2400, qualified: 1900, capitalGainDistributions: 300 }],
    businesses: [{
      name: 'Rivera Design Studio', owner: 'spouse', grossReceipts: 72000, hasInventory: true,
      cogs: { beginningInventory: 2000, purchases: 6000, endingInventory: 1500 },
      expenses: { advertising: 1200, insurance: 1200, legalProfessional: 900, officeExpense: 1500, supplies: 800, travel: 800, mealsTotal: 1000, utilities: 1100 },
    }],
    itemized: { medical: 4000, stateLocalIncomeOrSalesTax: 9500, realEstateTax: 7800, mortgageInterest1098: 14200, charityCash: 3000, charityNonCash: 500 },
    estimatedPayments: 6000,
  },
  expected: {
    form1040: { 9: 160050, 10: 4063, '11b': 155987, '12e': 35000, '13a': 10687, 15: 110300, 16: 13940, 19: 4400, 23: 8125, 24: 17665, 33: 15800, 37: 1865 },
    usesItemized: true, amountOwed: 1865, refund: 0,
  },
});
add({
  id: 'family-hoh-three-kids',
  category: 'family',
  description: 'Head of household, three young children, $45,000 wages, $2,000 withheld.',
  derivation: 'Std $23,625. TI $21,375. CTC $6,600 before tax-limit. EIC (3 children, other): max $8,046 − 21.06% × ($45,000 − $23,350) = $8,046 − $4,559 = $3,487. ACTC uses Part II-B (3 × $1,700 = $5,100 trigger).',
  input: { filingStatus: 'hoh', w2s: [{ wages: 45000, federalWithholding: 2000, socialSecurityWages: 45000, socialSecurityTax: 2790, medicareWages: 45000, medicareTax: 653 }], dependents: [{ firstName: 'A', under17: true, eicQualifying: true }, { firstName: 'B', under17: true, eicQualifying: true }, { firstName: 'C', under17: true, eicQualifying: true }] },
  expected: { form1040: { 15: 21375, '27a': 3487 }, standardDeduction: 23625 },
});
add({
  id: 'family-retired-couple',
  category: 'family',
  description: 'MFJ, both 65+, $40,000 qualified dividends and $8,000 taxable interest, no wages.',
  derivation: 'Std $31,500 + $1,600 + $1,600 = $34,700. Senior deduction $12,000 (MAGI $48,000 ≤ $150,000). TI = 48,000 − 34,700 − 12,000 = $1,300, all preferential after ordinary $8,000 is absorbed by deductions — QDCG applies. No EIC (age 65+ and MAGI).',
  input: {
    filingStatus: 'mfj',
    taxpayer: { bornBefore1961: true },
    spouse: { bornBefore1961: true },
    interest: [{ payer: 'Bank', taxable: 8000 }],
    dividends: [{ payer: 'Broker', ordinary: 40000, qualified: 40000 }],
  },
  expected: { standardDeduction: 34700, form1040: { '13b': 12000, 15: 1300 }, taxMethod: 'qdcg-worksheet' },
});
add({
  id: 'family-single-parent-tips',
  category: 'family',
  description: 'HOH restaurant worker, one child, $28,000 wages including $6,000 qualified tips.',
  derivation: 'Sch. 1-A tip deduction $6,000 (under cap, MAGI $28,000). Std $23,625. TI = 28,000 − 23,625 − 6,000 = $0? 28,000 − 23,625 = 4,375 − 6,000 → TI $0. CTC/ACTC and EIC still apply on earned income $28,000.',
  input: { filingStatus: 'hoh', w2s: [{ wages: 28000, federalWithholding: 500, socialSecurityWages: 28000, socialSecurityTax: 1736, medicareWages: 28000, medicareTax: 406, qualifiedTips: 6000 }], dependents: [{ firstName: 'A', under17: true, eicQualifying: true }] },
  expected: { form1040: { 15: 0, 16: 0, '13b': 6000 }, schedule1A: { 13: 6000 } },
});

// Some expected values use the sentinel 'GT0' which the runner must treat as > 0.
// We'll rewrite those after computing... actually the runner only does toBe.
// Fix: replace GT0 cases with real numbers or extend the runner.
// I'll compute the missing numbers by running a small preview after first write.

for (const c of cases) {
  writeFileSync(join(dir, `${c.id}.json`), JSON.stringify(c, null, 2) + '\n');
}
console.log(`wrote ${cases.length} cases`);
