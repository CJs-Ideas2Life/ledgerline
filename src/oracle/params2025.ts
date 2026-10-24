// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 2025 figures for the separately written cross-check. Copied from IRS primary sources,
 * not imported from src/engine/constants2025.ts.
 *
 * RP 2024-40: https://www.irs.gov/pub/irs-drop/rp-24-40.pdf
 * Form 1040 (2025) / i1040gi: https://www.irs.gov/pub/irs-pdf/f1040.pdf
 * OBBBA: P.L. 119-21
 */
export type Status = 'single' | 'mfj' | 'mfs' | 'hoh' | 'qss';

export const BRACKETS: Record<Status, { upTo: number; rate: number }[]> = {
  single: [{ upTo: 11925, rate: 0.1 }, { upTo: 48475, rate: 0.12 }, { upTo: 103350, rate: 0.22 }, { upTo: 197300, rate: 0.24 }, { upTo: 250525, rate: 0.32 }, { upTo: 626350, rate: 0.35 }, { upTo: Infinity, rate: 0.37 }],
  mfs: [{ upTo: 11925, rate: 0.1 }, { upTo: 48475, rate: 0.12 }, { upTo: 103350, rate: 0.22 }, { upTo: 197300, rate: 0.24 }, { upTo: 250525, rate: 0.32 }, { upTo: 375800, rate: 0.35 }, { upTo: Infinity, rate: 0.37 }],
  mfj: [{ upTo: 23850, rate: 0.1 }, { upTo: 96950, rate: 0.12 }, { upTo: 206700, rate: 0.22 }, { upTo: 394600, rate: 0.24 }, { upTo: 501050, rate: 0.32 }, { upTo: 751600, rate: 0.35 }, { upTo: Infinity, rate: 0.37 }],
  qss: [{ upTo: 23850, rate: 0.1 }, { upTo: 96950, rate: 0.12 }, { upTo: 206700, rate: 0.22 }, { upTo: 394600, rate: 0.24 }, { upTo: 501050, rate: 0.32 }, { upTo: 751600, rate: 0.35 }, { upTo: Infinity, rate: 0.37 }],
  hoh: [{ upTo: 17000, rate: 0.1 }, { upTo: 64850, rate: 0.12 }, { upTo: 103350, rate: 0.22 }, { upTo: 197300, rate: 0.24 }, { upTo: 250500, rate: 0.32 }, { upTo: 626350, rate: 0.35 }, { upTo: Infinity, rate: 0.37 }],
};

export const STD: Record<Status, number> = { single: 15750, mfs: 15750, mfj: 31500, qss: 31500, hoh: 23625 };
export const EXTRA_STD = { unmarried: 2000, married: 1600 };
export const DEP_STD = { min: 1350, addon: 450 };
export const TABLE_LIMIT = 100_000;
export const CG0: Record<Status, number> = { single: 48350, mfs: 48350, mfj: 96700, qss: 96700, hoh: 64750 };
export const CG15: Record<Status, number> = { single: 533400, mfs: 300000, mfj: 600050, qss: 600050, hoh: 566700 };
export const MED_FLOOR = 0.075;
export const SALT = { cap: 40000, mfsCap: 20000, start: 500000, startMfs: 250000, rate: 0.3, floor: 10000, floorMfs: 5000 };
export const CTC = { child: 2200, other: 500, startMfj: 400000, startOther: 200000, actc: 1700, eiFloor: 2500, eiRate: 0.15, part2b: 5100 };
export const SE = { factor: 0.9235, min: 400, wageBase: 176100, ss: 0.124, med: 0.029, half: 0.5 };
export const ADD_MED = { rate: 0.009, regular: 0.0145, th: { single: 200000, hoh: 200000, qss: 200000, mfj: 250000, mfs: 125000 } as Record<Status, number> };
export const NIIT = { rate: 0.038, th: { single: 200000, hoh: 200000, mfj: 250000, qss: 250000, mfs: 125000 } as Record<Status, number> };
export const QBI = { rate: 0.2, th: { single: 197300, hoh: 197300, qss: 197300, mfs: 197300, mfj: 394600 } as Record<Status, number>, range: { single: 50000, hoh: 50000, qss: 50000, mfs: 50000, mfj: 100000 } as Record<Status, number> };
export const SENIOR = { amt: 6000, start: 75000, startMfj: 150000, rate: 0.06 };
export const TIPS = { cap: 25000, start: 150000, startMfj: 300000, perK: 100 };
export const OT = { cap: 12500, capMfj: 25000, start: 150000, startMfj: 300000, perK: 100 };
export const CAR = { cap: 10000, start: 100000, startMfj: 200000, perK: 200 };
export const CHARITY = { cash: 0.6, noncash: 0.3, overall: 0.6 };
export const MORT = { cap: 750000, mfs: 375000 };
export const CAPLOSS = { lim: 3000, mfs: 1500 };
export const RET = { elective: 23500, catchup: 7500, dc: 70000, comp: 350000, rate: 0.2 };
export const EIC = {
  earned: [8490, 12730, 17880, 17880],
  max: [649, 4328, 7152, 8046],
  rate: [0.0765, 0.34, 0.4, 0.45],
  phaseRate: [0.0765, 0.1598, 0.2106, 0.2106],
  phaseStart: { joint: [17730, 30470, 30470, 30470], other: [10620, 23350, 23350, 23350] },
  done: { joint: [26214, 57554, 64430, 68675], other: [19104, 50434, 57310, 61555] },
  invest: 11950,
};
export const AMT = {
  ex: { single: 88100, hoh: 88100, mfj: 137000, qss: 137000, mfs: 68500 } as Record<Status, number>,
  poStart: { single: 626350, hoh: 626350, mfj: 1252700, qss: 1252700, mfs: 626350 } as Record<Status, number>,
  poDone: { single: 978750, hoh: 978750, mfj: 1800700, qss: 1800700, mfs: 900350 } as Record<Status, number>,
  poRate: 0.25,
  cap26: { single: 239100, hoh: 239100, mfj: 239100, qss: 239100, mfs: 119550 } as Record<Status, number>,
  extra28: { default: 4782, mfs: 2391 },
  med: 0.1,
  mfsExtra: 900350,
};
export const EST = { cy: 0.9, py: 1, pyHigh: 1.1, high: 150000, highMfs: 75000, floor: 1000, rate: 0.07, days: [61, 92, 122, 90] as const };
export const SCH_B = 1500;
export const MEALS = 0.5;
