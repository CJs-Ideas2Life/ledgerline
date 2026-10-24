import { describe, expect, it } from 'vitest';
import table from './taxTable2025.json';
import { regularTax, scheduleTax, taxTable, taxComputationWorksheet, qdcgWorksheet, type FilingStatus } from '../../src/engine';

describe('2025 Tax Table (all 2,059 printed rows from Form 1040 instructions)', () => {
  it('has the expected number of rows', () => {
    expect((table as number[][]).length).toBe(2059);
  });
  it('matches every row and filing-status column', () => {
    const cols: FilingStatus[] = ['single', 'mfj', 'mfs', 'hoh'];
    let mismatches: string[] = [];
    for (const [lo, hi, ...taxes] of table as number[][]) {
      for (const probe of [lo, (lo + hi) / 2, hi - 1]) {
        cols.forEach((c, i) => {
          const got = taxTable(probe, c);
          if (got !== taxes[i]) mismatches.push(`${probe} ${c}: got ${got} want ${taxes[i]}`);
        });
      }
    }
    expect(mismatches.slice(0, 10)).toEqual([]);
  });
  it('handles the first three special rows (0–5, 5–15, 15–25)', () => {
    expect(taxTable(4, 'single')).toBe(0);
    expect(taxTable(5, 'single')).toBe(1);
    expect(taxTable(14, 'mfj')).toBe(1);
    expect(taxTable(15, 'hoh')).toBe(2);
    expect(taxTable(24, 'mfs')).toBe(2);
  });
  it('QSS uses the MFJ column', () => {
    expect(taxTable(25_300, 'qss')).toBe(2_562); // instructions' sample: MFJ $25,300–25,350 => $2,562
    expect(taxTable(25_300, 'mfj')).toBe(2_562);
  });
});

describe('Rate schedules (Rev. Proc. 2024-40 Tables 1–4 base amounts)', () => {
  const cases: [FilingStatus, number, number][] = [
    ['mfj', 23_850, 2_385], ['mfj', 96_950, 11_157], ['mfj', 206_700, 35_302], ['mfj', 394_600, 80_398],
    ['mfj', 501_050, 114_462], ['mfj', 751_600, 202_154.5],
    ['hoh', 17_000, 1_700], ['hoh', 64_850, 7_442], ['hoh', 103_350, 15_912], ['hoh', 197_300, 38_460],
    ['hoh', 250_500, 55_484], ['hoh', 626_350, 187_031.5],
    ['single', 11_925, 1_192.5], ['single', 48_475, 5_578.5], ['single', 103_350, 17_651], ['single', 197_300, 40_199],
    ['single', 250_525, 57_231], ['single', 626_350, 188_769.75],
    ['mfs', 250_525, 57_231], ['mfs', 375_800, 101_077.25],
  ];
  it.each(cases)('%s at %d = %d', (fs, ti, want) => {
    expect(scheduleTax(ti, fs)).toBeCloseTo(want, 2);
  });
});

describe('Tax Computation Worksheet (>= $100,000) subtraction amounts', () => {
  const cases: [FilingStatus, number, number, number][] = [
    ['single', 150_000, 0.24, 7_153], ['single', 300_000, 0.35, 30_452.75], ['single', 800_000, 0.37, 42_979.75],
    ['mfj', 150_000, 0.22, 10_172], ['mfj', 450_000, 0.32, 45_874], ['mfj', 900_000, 0.37, 75_937.5],
    ['mfs', 400_000, 0.37, 37_968.75], ['hoh', 120_000, 0.24, 8_892], ['hoh', 700_000, 0.37, 44_718],
    ['qss', 250_000, 0.24, 14_306],
  ];
  it.each(cases)('%s %d => x%d − %d', (fs, ti, rate, sub) => {
    expect(taxComputationWorksheet(ti, fs)).toBe(Math.round(ti * rate - sub));
    expect(regularTax(ti, fs)).toBe(Math.round(ti * rate - sub));
  });
  it('switches from table to worksheet exactly at $100,000', () => {
    expect(regularTax(99_999, 'single')).toBe(taxTable(99_999, 'single'));
    expect(regularTax(100_000, 'single')).toBe(100_000 * 0.22 - 5_086);
  });
});

describe('Qualified Dividends and Capital Gain Tax Worksheet', () => {
  it('all-qualified income inside the 0% band is untaxed', () => {
    const w = qdcgWorksheet(40_000, 40_000, 0, 'single');
    expect(w['25']).toBe(0);
  });
  it('hand-checked single: TI 60,000 with 20,000 qualified dividends', () => {
    // line 5 = 40,000 ordinary -> table tax on 40,000 (row 40,000–40,050, mid 40,025)
    // = 1,192.50 + 12% x 28,100 = 4,564.50 -> 4,565
    // line 7 = 48,350; line 8 = 40,000; line 9 = 8,350 at 0%
    // line 17 = 11,650 at 15% = 1,747.50 -> 1,748; total 6,313
    const w = qdcgWorksheet(60_000, 20_000, 0, 'single');
    expect(w['22']).toBe(4_565);
    expect(w['9']).toBe(8_350);
    expect(w['17']).toBe(11_650);
    expect(w['18']).toBe(1_748);
    expect(w['25']).toBe(6_313);
  });
  it('20% band applies above the 15% maximum (MFJ)', () => {
    // TI 700,000, QD 200,000: line 5 = 500,000; line 14 = 600,050; line 16 = 100,050 at 15%; 99,950 at 20%
    const w = qdcgWorksheet(700_000, 200_000, 0, 'mfj');
    expect(w['17']).toBe(100_050);
    expect(w['20']).toBe(99_950);
    expect(w['21']).toBe(19_990);
    expect(w['22']).toBe(Math.round(500_000 * 0.32 - 45_874));
  });
  it('never exceeds regular tax (line 25 = smaller of 23 and 24)', () => {
    const w = qdcgWorksheet(5_000, 100, 0, 'single');
    expect(w['25']).toBeLessThanOrEqual(w['24']);
  });
});
