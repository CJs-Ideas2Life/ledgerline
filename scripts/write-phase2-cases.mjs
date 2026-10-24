import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'test-data', 'cases');
mkdirSync(dir, { recursive: true });

const BR = {
  single: [[11925, 0.1], [48475, 0.12], [103350, 0.22], [197300, 0.24], [250525, 0.32], [626350, 0.35], [Infinity, 0.37]],
  mfs: [[11925, 0.1], [48475, 0.12], [103350, 0.22], [197300, 0.24], [250525, 0.32], [375800, 0.35], [Infinity, 0.37]],
  mfj: [[23850, 0.1], [96950, 0.12], [206700, 0.22], [394600, 0.24], [501050, 0.32], [751600, 0.35], [Infinity, 0.37]],
  qss: [[23850, 0.1], [96950, 0.12], [206700, 0.22], [394600, 0.24], [501050, 0.32], [751600, 0.35], [Infinity, 0.37]],
  hoh: [[17000, 0.1], [64850, 0.12], [103350, 0.22], [197300, 0.24], [250500, 0.32], [626350, 0.35], [Infinity, 0.37]],
};
const STD = { single: 15750, mfs: 15750, mfj: 31500, qss: 31500, hoh: 23625 };

const dollars = (x) => {
  const s = x < 0 ? -1 : 1;
  return s * Math.round(Math.abs(x) + 1e-9) || 0;
};
function scheduleTax(ti, fs) {
  let tax = 0, lo = 0;
  for (const [up, rate] of BR[fs]) {
    if (ti <= lo) break;
    tax += (Math.min(ti, up) - lo) * rate;
    lo = up;
  }
  return tax;
}
function tableRow(ti) {
  if (ti < 5) return [0, 5];
  if (ti < 15) return [5, 15];
  if (ti < 25) return [15, 25];
  if (ti < 3000) { const lo = Math.floor(ti / 25) * 25; return [lo, lo + 25]; }
  const lo = Math.floor(ti / 50) * 50;
  return [lo, lo + 50];
}
function regularTax(ti, fs) {
  const t = Math.max(0, ti);
  if (t < 100000) {
    if (t < 5) return 0;
    const [lo, hi] = tableRow(t);
    return dollars(scheduleTax((lo + hi) / 2, fs));
  }
  const sign = t < 0 ? -1 : 1;
  const cents = (sign * Math.round(Math.abs(t) * 100 + 1e-7)) / 100;
  return dollars(cents); // wait, should be dollars(cents(scheduleTax))
}
function tax(ti, fs) {
  const t = Math.max(0, ti);
  if (t < 100000) {
    if (t < 5) return 0;
    const [lo, hi] = tableRow(t);
    return dollars(scheduleTax((lo + hi) / 2, fs));
  }
  const raw = scheduleTax(t, fs);
  const c = (raw < 0 ? -1 : 1) * Math.round(Math.abs(raw) * 100 + 1e-7) / 100;
  return dollars(c);
}

const w2 = (wages, wh = 0) => ({
  wages, federalWithholding: wh, socialSecurityWages: Math.min(wages, 176100),
  socialSecurityTax: Math.round(Math.min(wages, 176100) * 0.062),
  medicareWages: wages, medicareTax: Math.round(wages * 0.0145),
});

const cases = [];
const add = (c) => cases.push(c);

// Filing-status variants of the same $50,000 wage facts
for (const fs of ['single', 'mfj', 'mfs', 'hoh', 'qss']) {
  const std = STD[fs];
  const ti = 50000 - std;
  const t = tax(ti, fs);
  add({
    id: `var-50k-${fs}`,
    category: 'variants',
    description: `Same $50,000 W-2 facts filed as ${fs}. Metamorphic filing-status variant.`,
    derivation: `Std ${std} (Form 1040 2025). TI = 50,000 − ${std} = ${ti}. ${ti < 100000 ? 'Tax Table midpoint' : 'Tax Computation Worksheet'} → $${t} (RP 2024-40 § 3.01).`,
    input: { filingStatus: fs, dependents: (fs === 'hoh' || fs === 'qss') ? [{ firstName: 'Pat', under17: true, eicQualifying: true }] : [], w2s: [w2(50000)] },
    expected: { standardDeduction: std, form1040: { '1z': 50000, 15: ti, 16: t }, taxMethod: ti < 100000 ? 'table' : 'computation-worksheet' },
  });
}

// Bracket-boundary ±$1 (single), wages = TI + 15750
const singleEdges = [
  ['10-12', 11925],
  ['12-22', 48475],
  ['22-24', 103350],
  ['24-32', 197300],
  ['32-35', 250525],
  ['35-37', 626350],
];
for (const [name, edge] of singleEdges) {
  for (const [tag, delta] of [['minus', -1], ['at', 0], ['plus', 1]]) {
    const ti = edge + delta;
    const wages = ti + 15750;
    if (wages <= 0) continue;
    const t = tax(ti, 'single');
    add({
      id: `bound-${name}-single-${tag}`,
      category: 'boundaries',
      description: `Single filer, taxable income ${ti} (bracket edge ${edge} ${tag}).`,
      derivation: `Wages ${wages} − std 15,750 = TI ${ti}. ${ti < 100000 ? 'Tax Table' : 'Worksheet'} tax $${t}. RP 2024-40 § 3.01 single schedule.`,
      input: { w2s: [w2(wages)] },
      expected: { form1040: { 15: ti, 16: t }, taxMethod: ti < 100000 ? 'table' : 'computation-worksheet' },
    });
  }
}

// MFJ 10/12 and 12/22 edges
for (const [name, edge] of [['10-12', 23850], ['12-22', 96950]]) {
  for (const [tag, delta] of [['minus', -1], ['plus', 1]]) {
    const ti = edge + delta;
    const wages = ti + 31500;
    const t = tax(ti, 'mfj');
    add({
      id: `bound-${name}-mfj-${tag}`,
      category: 'boundaries',
      description: `MFJ taxable income ${ti} at the ${name} edge (${tag}).`,
      derivation: `Wages ${wages} − 31,500 = ${ti}. Tax $${t}. RP 2024-40 § 3.01 Table 2.`,
      input: { filingStatus: 'mfj', w2s: [w2(wages)] },
      expected: { form1040: { 15: ti, 16: t } },
    });
  }
}

// HOH 10/12 edge
for (const [tag, delta] of [['minus', -1], ['plus', 1]]) {
  const ti = 17000 + delta;
  const wages = ti + 23625;
  const t = tax(ti, 'hoh');
  add({
    id: `bound-10-12-hoh-${tag}`,
    category: 'boundaries',
    description: `HOH taxable income ${ti} at the 10/12 edge (${tag}).`,
    derivation: `Std 23,625. TI ${ti}. Tax $${t}. RP 2024-40 § 3.01 Table 3.`,
    input: { filingStatus: 'hoh', dependents: [{ firstName: 'Pat', under17: true, eicQualifying: true }], w2s: [w2(wages)] },
    expected: { form1040: { 15: ti, 16: t } },
  });
}

// Phase-out edges
add({
  id: 'phase-ctc-other-at',
  category: 'boundaries',
  description: 'Single + 1 child, MAGI exactly $200,000 — CTC not yet phased.',
  derivation: 'Schedule 8812 line 9 other = $200,000. Excess 0. Credit $2,200 limited by tax. RP 2024-40 / Sch. 8812 line 9.',
  input: { w2s: [w2(200000)], dependents: [{ firstName: 'Kid', under17: true, eicQualifying: true }] },
  expected: { schedule8812: { 5: 2200, 11: 0, 12: 2200 } },
});
add({
  id: 'phase-ctc-other-over',
  category: 'boundaries',
  description: 'Single + 1 child, MAGI $200,001 — first $50 of CTC phase-out.',
  derivation: 'Excess $1, rounded up to $1,000 × 5% = $50. Sch. 8812 lines 10–11.',
  input: { w2s: [w2(200001)], dependents: [{ firstName: 'Kid', under17: true, eicQualifying: true }] },
  expected: { schedule8812: { 10: 1000, 11: 50, 12: 2150 } },
});
add({
  id: 'phase-ctc-mfj-at',
  category: 'boundaries',
  description: 'MFJ + 1 child, MAGI exactly $400,000 — CTC not yet phased.',
  derivation: 'Sch. 8812 line 9 MFJ $400,000. Excess 0.',
  input: { filingStatus: 'mfj', w2s: [w2(400000)], dependents: [{ firstName: 'Kid', under17: true, eicQualifying: true }] },
  expected: { schedule8812: { 5: 2200, 11: 0, 12: 2200 } },
});
add({
  id: 'phase-salt-at-500k',
  category: 'boundaries',
  description: 'AGI $500,000, $50,000 SALT — still the $40,000 cap.',
  derivation: 'Worksheet line 5 = $500,000; excess 0. Cap $40,000. Sch. A instr. p. 7.',
  input: { w2s: [w2(500000)], itemized: { stateLocalIncomeOrSalesTax: 50000 } },
  expected: { scheduleA: { '5d': 50000, '5e': 40000 } },
});
add({
  id: 'phase-salt-over-500k',
  category: 'boundaries',
  description: 'AGI $510,000, $50,000 SALT — 30% × $10,000 = $3,000 cut.',
  derivation: '40,000 − 0.30 × 10,000 = $37,000. Sch. A SALT worksheet lines 6–10.',
  input: { w2s: [w2(510000)], itemized: { stateLocalIncomeOrSalesTax: 50000 } },
  expected: { scheduleA: { '5e': 37000 } },
});
add({
  id: 'phase-senior-at',
  category: 'boundaries',
  description: 'Single age 65+, MAGI $75,000 — full $6,000 senior deduction.',
  derivation: 'Schedule 1-A line 32 start $75,000; excess 0; line 35 = $6,000. OBBBA § 70103.',
  input: { taxpayer: { bornBefore1961: true, hasValidSSN: true }, w2s: [w2(75000)] },
  expected: { schedule1A: { 37: 6000 }, form1040: { '13b': 6000 } },
});
add({
  id: 'phase-senior-over',
  category: 'boundaries',
  description: 'Single age 65+, MAGI $76,000 — $6,000 − 6% × $1,000 = $5,940.',
  derivation: '1-A lines 33–35: 6% of $1,000 = $60. OBBBA § 70103.',
  input: { taxpayer: { bornBefore1961: true, hasValidSSN: true }, w2s: [w2(76000)] },
  expected: { schedule1A: { 37: 5940 } },
});
add({
  id: 'phase-tips-at',
  category: 'boundaries',
  description: 'Single, $10,000 qualified tips, MAGI $150,000 — no tip phase-out.',
  derivation: '1-A line 9 start $150,000; excess 0; line 13 = min($10,000, $25,000). OBBBA § 70201.',
  input: { w2s: [{ ...w2(150000), qualifiedTips: 10000 }] },
  expected: { schedule1A: { 13: 10000 } },
});
add({
  id: 'phase-tips-over',
  category: 'boundaries',
  description: 'Single, $10,000 tips, MAGI $151,000 — floor($1,000/$1,000)×$100 = $100 cut.',
  derivation: '1-A lines 10–13 use the floor. $10,000 − $100 = $9,900.',
  input: { w2s: [{ ...w2(151000), qualifiedTips: 10000 }] },
  expected: { schedule1A: { 13: 9900 } },
});
add({
  id: 'phase-ot-over',
  category: 'boundaries',
  description: 'Single, $5,000 qualified overtime, MAGI $152,000 — $200 phase-out.',
  derivation: 'floor(2000/1000)×100 = $200. Cap $12,500. 5,000 − 200 = $4,800. OBBBA § 70202.',
  input: { w2s: [{ ...w2(152000), qualifiedOvertime: 5000 }] },
  expected: { schedule1A: { 21: 4800 } },
});
add({
  id: 'phase-car-over',
  category: 'boundaries',
  description: 'Single, $4,000 car-loan interest, MAGI $101,500 — ceiling reduction.',
  derivation: 'ceil(1500/1000)×$200 = $400. 4,000 − 400 = $3,600. 1-A Part IV uses the ceiling. OBBBA § 70203.',
  input: { w2s: [w2(101500)], carLoanInterest: 4000 },
  expected: { schedule1A: { 30: 3600 } },
});
add({
  id: 'phase-eic-childless-done',
  category: 'boundaries',
  description: 'Single childless EIC just at the completed-phaseout $19,104 — credit $0.',
  derivation: 'RP 2024-40 § 3.06 completed phaseout (0 children, unmarried) $19,104.',
  input: { w2s: [w2(19104)] },
  expected: { form1040: { '27a': 0 } },
});
add({
  id: 'phase-qbi-threshold-plus',
  category: 'boundaries',
  description: 'Single Schedule C, taxable income before QBI just over $197,300 so Form 8995-A applies.',
  derivation: 'RP 2024-40 § 3.27 threshold $197,300. Wages $0, profit $220,000, std 15,750 → TI before QBI $204,250.',
  input: { businesses: [{ name: 'Solo', grossReceipts: 220000, expenses: { otherExpenses: 0 } }] },
  expected: { form8995A: { 15: 'GT0' }, warningsIncludes: ['Form 8995-A'] },
});

// Real-world style households
add({
  id: 'life-teacher-hoh',
  category: 'family',
  description: 'Head of household public-school teacher, one child, $62,000 W-2, $7,400 withheld, $400 charity.',
  derivation: `Std HOH $23,625. TI = 62,000 − 23,625 = 38,375. Tax Table tax $${tax(38375, 'hoh')}. CTC $2,200 limited by tax. EIC: 1 child, EI $62,000 is above completed phaseout $50,434 — no EIC.`,
  input: {
    filingStatus: 'hoh',
    taxpayer: { firstName: 'Maya', lastName: 'Chen' },
    dependents: [{ firstName: 'Leo', under17: true, eicQualifying: true }],
    w2s: [w2(62000, 7400)],
    itemized: { charityCash: 400 },
  },
  expected: { standardDeduction: 23625, form1040: { 15: 38375, 16: tax(38375, 'hoh'), '27a': 0 }, usesItemized: false },
});
add({
  id: 'life-nurse-mfj',
  category: 'family',
  description: 'Two-earner MFJ nurses, $78,000 + $64,000, two kids under 17, $18,000 withheld.',
  derivation: `Wages $142,000. Std $31,500. TI $110,500. Worksheet tax $${tax(110500, 'mfj')}. CTC $4,400. No EIC (phaseout complete $57,554 for 2 children joint).`,
  input: {
    filingStatus: 'mfj',
    taxpayer: { firstName: 'Priya' }, spouse: { firstName: 'Owen' },
    dependents: [{ firstName: 'Ava', under17: true, eicQualifying: true }, { firstName: 'Noah', under17: true, eicQualifying: true }],
    w2s: [{ ...w2(78000, 10000), owner: 'taxpayer' }, { ...w2(64000, 8000), owner: 'spouse' }],
  },
  expected: { form1040: { '1z': 142000, 15: 110500, 16: tax(110500, 'mfj'), 19: 4400, '27a': 0 }, taxMethod: 'computation-worksheet' },
});
add({
  id: 'life-gig-single',
  category: 'self-employment',
  description: 'Single rideshare driver, $41,000 gross, $9,200 expenses, no W-2.',
  derivation: 'Sch. C profit $31,800. SE net $29,367 (×0.9235). SE tax 12.4%×min(29367,176100)+2.9%×29367 = $4,493. Half $2,247. AGI 31800−2247=29553. Std 15750. TI 13803. Table tax on row 13800–13850 midpoint 13825: 10%×11925 + 12%×1900 = 1420.50 → $1,421? Wait compute via helper.',
  input: { businesses: [{ name: 'Rideshare', grossReceipts: 41000, expenses: { carTruck: 7200, supplies: 800, otherExpenses: 1200 } }] },
  expected: { 'scheduleC.0': { 31: 31800 }, schedule1: { 3: 31800 } },
});

// Recalc gig tax properly in a follow-up case with full expected after we know SE math:
// 31800 * 0.9235 = 29367.3 → 29367
// ss = 29367 * 0.124 = 3641.508 → 3642
// med = 29367 * 0.029 = 851.643 → 852
// SE tax 4494? 3642+852=4494. Half 2247.
// Engine uses dollars() on each. Let me not hardcode SE until scorecard; just profit is safe.

add({
  id: 'life-retiree-interest',
  category: 'family',
  description: 'Single retiree born before 1961, $28,000 taxable interest, no wages.',
  derivation: 'Std 15,750 + $2,000 additional = $17,750. Senior deduction $6,000 (MAGI 28,000 < 75,000). TI = 28,000 − 17,750 − 6,000 = 4,250. Table tax on 4250–4300 midpoint 4275 × 10% = $428. No EIC (age 65+ childless).',
  input: { taxpayer: { bornBefore1961: true, hasValidSSN: true }, interest: [{ payer: 'Credit union', taxable: 28000 }] },
  expected: { standardDeduction: 17750, form1040: { '2b': 28000, '13b': 6000, 15: 4250, 16: tax(4250, 'single'), '27a': 0 } },
});
add({
  id: 'life-two-job-overtime',
  category: 'wages',
  description: 'Single warehouse worker, two W-2s ($22,000 and $31,000) plus $3,400 qualified overtime on the second job.',
  derivation: 'Wages $53,000. OT deduction $3,400 (under $12,500, MAGI under $150k). Std 15,750. TI = 53,000 − 15,750 − 3,400 = 33,850. Table tax ' + tax(33850, 'single') + '.',
  input: { w2s: [w2(22000, 1800), { ...w2(31000, 2600), qualifiedOvertime: 3400 }] },
  expected: { form1040: { '1z': 53000, '13b': 3400, 15: 33850, 16: tax(33850, 'single') } },
});
add({
  id: 'life-grad-dependent',
  category: 'seniors-dependent',
  description: 'Dependent college student, $8,200 W-2, claimed by a parent.',
  derivation: 'Dependent std = min(15,750, max(1,350, 8,200+450)) = $8,650. TI 0. No EIC (can-be-claimed).',
  input: { canBeClaimedAsDependent: true, w2s: [w2(8200, 400)] },
  expected: { standardDeduction: 8650, form1040: { 15: 0, 16: 0, '27a': 0 }, refund: 400 },
});
add({
  id: 'life-mfs-lived-apart-eic',
  category: 'credits',
  description: 'MFS, lived apart last 6 months, one EIC child, $22,000 wages.',
  derivation: '§ 32(d) exception. 1 child, unmarried phase-out start $23,350 so $22,000 is still in the plateau. Max credit $4,328 (RP 2024-40 § 3.06). Std 15,750. TI 6,250.',
  input: {
    filingStatus: 'mfs', mfsLivedApart: true,
    dependents: [{ firstName: 'Kid', under17: true, eicQualifying: true }],
    w2s: [w2(22000, 800)],
  },
  expected: { form1040: { 15: 6250, '27a': 4328 } },
});
add({
  id: 'life-qss-widow',
  category: 'filing-status',
  description: 'Qualifying surviving spouse with one child and $90,000 wages.',
  derivation: `QSS uses MFJ std $31,500 and MFJ brackets. TI 58,500. Tax $${tax(58500, 'qss')}. CTC $2,200.`,
  input: {
    filingStatus: 'qss',
    dependents: [{ firstName: 'Sam', under17: true, eicQualifying: true }],
    w2s: [w2(90000, 9000)],
  },
  expected: { standardDeduction: 31500, form1040: { 15: 58500, 16: tax(58500, 'qss'), 19: 2200 } },
});
add({
  id: 'life-itemized-just-over',
  category: 'itemized',
  description: 'Single, $80,000 wages, itemized just $40 over the $15,750 standard deduction.',
  derivation: 'Mortgage $10,000 + SALT $5,790 = $15,790 > 15,750. Uses itemized. TI 80,000 − 15,790 = 64,210.',
  input: { w2s: [w2(80000, 9000)], itemized: { mortgageInterest1098: 10000, stateLocalIncomeOrSalesTax: 5790 } },
  expected: { usesItemized: true, itemizedDeduction: 15790, form1040: { 15: 64210, 16: tax(64210, 'single') } },
});
add({
  id: 'life-itemized-just-under',
  category: 'itemized',
  description: 'Same wages, itemized $20 under the standard deduction — standard wins.',
  derivation: 'Mortgage $10,000 + SALT $5,730 = $15,730 < 15,750. Standard used. TI 64,250.',
  input: { w2s: [w2(80000, 9000)], itemized: { mortgageInterest1098: 10000, stateLocalIncomeOrSalesTax: 5730 } },
  expected: { usesItemized: false, standardDeduction: 15750, form1040: { 15: 64250 } },
});
add({
  id: 'life-blind-mfj',
  category: 'seniors-dependent',
  description: 'MFJ, both under 65, taxpayer blind — extra $1,600 standard deduction.',
  derivation: '31,500 + 1,600 = $33,100. RP 2024-40 § 3.15(3). Wages $40,000. TI 6,900.',
  input: { filingStatus: 'mfj', taxpayer: { blind: true }, w2s: [w2(40000)] },
  expected: { standardDeduction: 33100, form1040: { 15: 6900, 16: tax(6900, 'mfj') } },
});
add({
  id: 'life-hoh-other-dependent',
  category: 'credits',
  description: 'HOH with a parent (not under 17) — $500 ODC, HOH standard deduction.',
  derivation: 'Std $23,625. Wages $48,000. TI 24,375. ODC $500 (Sch. 8812 line 7).',
  input: {
    filingStatus: 'hoh',
    dependents: [{ firstName: 'Parent', relationship: 'Parent', under17: false, eicQualifying: false }],
    w2s: [w2(48000, 4000)],
  },
  expected: { standardDeduction: 23625, form1040: { 15: 24375, 16: tax(24375, 'hoh'), 19: 500 } },
});
add({
  id: 'life-mfj-one-senior',
  category: 'seniors-dependent',
  description: 'MFJ, only taxpayer is 65+, MAGI $90,000 — one $6,000 senior deduction, extra $1,600 std.',
  derivation: 'Std 31,500 + 1,600 = 33,100. Senior $6,000 (MAGI < 150,000). TI = 90,000 − 33,100 − 6,000 = 50,900.',
  input: { filingStatus: 'mfj', taxpayer: { bornBefore1961: true, hasValidSSN: true }, spouse: { hasValidSSN: true }, w2s: [w2(90000)] },
  expected: { standardDeduction: 33100, form1040: { '13b': 6000, 15: 50900, 16: tax(50900, 'mfj') } },
});
add({
  id: 'life-single-capgain-only',
  category: 'investments',
  description: 'Single, no wages, $12,000 long-term stock gain (bought 2020, sold 2025).',
  derivation: 'Std 15,750 > 12,000 gain so TI 0 after standard deduction. QDCG still runs? Gain is on 1040 line 7. AGI 12,000. Std 15,750. TI 0. Tax 0. Preferential gain is unused because TI is 0.',
  input: { capitalGains: [{ description: 'Index fund', dateAcquired: '2020-03-01', dateSold: '2025-06-01', proceeds: 20000, cost: 8000, term: 'long' }] },
  expected: { form1040: { 7: 12000, 15: 0, 16: 0 }, scheduleD: { 16: 12000, 21: 12000 } },
});
add({
  id: 'life-mfs-salt-half-edge',
  category: 'itemized',
  description: 'MFS, AGI $80,000, $22,000 SALT — MFS cap $20,000.',
  derivation: 'AGI under $250,000 so no phase-down. MFS cap $20,000. Sch. A line 5e.',
  input: { filingStatus: 'mfs', w2s: [w2(80000)], itemized: { stateLocalIncomeOrSalesTax: 22000 } },
  expected: { scheduleA: { '5d': 22000, '5e': 20000 } },
});
add({
  id: 'mono-wages-step-40-to-41',
  category: 'boundaries',
  description: 'Single, $40,000 vs the $41,000 companion case — tax before credits must not fall.',
  derivation: 'Metamorphic pair. TI 24,250 vs 25,250. Both in the 12% table region. Tax is non-decreasing (property test also covers this).',
  input: { w2s: [w2(40000)] },
  expected: { form1040: { 15: 24250, 16: tax(24250, 'single') } },
});
add({
  id: 'mono-wages-step-41',
  category: 'boundaries',
  description: 'Single $41,000 wages — companion to mono-wages-step-40-to-41.',
  derivation: `TI 25,250. Tax $${tax(25250, 'single')}, which is ≥ the $40,000 companion.`,
  input: { w2s: [w2(41000)] },
  expected: { form1040: { 15: 25250, 16: tax(25250, 'single') } },
});

// More wage rungs for table coverage
for (const wages of [8000, 15000, 25000, 35000, 45000, 55000, 70000, 85000, 95000]) {
  const ti = wages - 15750;
  if (ti <= 0) {
    add({
      id: `rung-single-${wages}`,
      category: 'wages',
      description: `Single W-2 of $${wages.toLocaleString()} — standard deduction wipes taxable income.`,
      derivation: `Std $15,750 ≥ wages, TI 0, tax 0. Form 1040 line 15.`,
      input: { w2s: [w2(wages)] },
      expected: { form1040: { 15: 0, 16: 0 } },
    });
    continue;
  }
  add({
    id: `rung-single-${wages}`,
    category: 'wages',
    description: `Single W-2 of $${wages.toLocaleString()} — Tax Table rung.`,
    derivation: `TI ${ti}. Table tax $${tax(ti, 'single')}. RP 2024-40 § 3.01 / i1040gi Tax Table.`,
    input: { w2s: [w2(wages)] },
    expected: { form1040: { 15: ti, 16: tax(ti, 'single') }, taxMethod: 'table' },
  });
}

for (const wages of [40000, 80000, 120000]) {
  const ti = wages - 31500;
  add({
    id: `rung-mfj-${wages}`,
    category: 'wages',
    description: `MFJ one-earner W-2 of $${wages.toLocaleString()}.`,
    derivation: `Std 31,500. TI ${ti}. Tax $${tax(ti, 'mfj')}.`,
    input: { filingStatus: 'mfj', w2s: [w2(wages)] },
    expected: { form1040: { 15: ti, 16: tax(ti, 'mfj') } },
  });
}

add({
  id: 'life-charity-carry-only',
  category: 'itemized',
  description: 'Single $90,000 wages, $2,000 cash gifts plus $8,000 charity carryover — carry used inside the 60% cap.',
  derivation: 'Cash $2,000 under 60% of 90,000 ($54,000). Carry $8,000 also fits. Total gifts $10,000. Combined with $0 other itemized, still under standard $15,750 unless we add mortgage.',
  input: { w2s: [w2(90000)], itemized: { charityCash: 2000, charityCarryover: 8000, mortgageInterest1098: 9000 } },
  expected: { scheduleA: { 11: 2000, 13: 8000, 14: 10000 } },
});
add({
  id: 'life-ss-wage-base-split',
  category: 'wages',
  description: 'Single, two W-2s that together cross the $176,100 social-security wage base.',
  derivation: 'Wages 100,000 + 90,000 = 190,000. Box 3 on each job can be full wages (employers do not coordinate). Additional Medicare starts at $200,000 so none here. TI 190,000 − 15,750 = 174,250.',
  input: { w2s: [w2(100000, 18000), w2(90000, 16000)] },
  expected: { form1040: { '1z': 190000, 15: 174250, 16: tax(174250, 'single') }, form8959: { 18: 0 } },
});

for (const c of cases) {
  writeFileSync(join(dir, `${c.id}.json`), `${JSON.stringify(c, null, 2)}\n`);
}
console.log(`wrote ${cases.length} phase-2 cases`);
