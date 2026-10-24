import { describe, expect, it } from 'vitest';
import { computeReturn } from '../../src/engine';
import { ret, w2, kid } from './helpers';

/**
 * Metamorphic / property checks. Phase-out cliffs that can break naive
 * monotonicity are documented on the matching Rules & Why entries
 * (ctc-8812, eic-32, salt-worksheet, s1a-*, qbi-8995a-w2-ubia, senior-deduction).
 */
describe('property: more wages never lowers tax before credits', () => {
  it.each(['single', 'mfj', 'mfs', 'hoh', 'qss'] as const)('%s ordinary-wage path is non-decreasing on line 16', (fs) => {
    let prev = 0;
    for (const wages of [0, 5_000, 20_000, 40_000, 60_000, 80_000, 100_000, 150_000, 250_000, 400_000]) {
      const r = computeReturn(ret({
        filingStatus: fs,
        dependents: fs === 'hoh' || fs === 'qss' ? [kid(1)] : [],
        w2s: [w2(wages)],
      }));
      expect(r.form1040['16'], `${fs} wages ${wages}`).toBeGreaterThanOrEqual(prev);
      prev = r.form1040['16'];
    }
  });
});

describe('property: filing-status variants of the same $50,000 W-2', () => {
  const std: Record<string, number> = { single: 15750, mfs: 15750, mfj: 31500, qss: 31500, hoh: 23625 };
  it.each(Object.entries(std))('%s standard deduction %d', (fs, want) => {
    const r = computeReturn(ret({
      filingStatus: fs as 'single',
      dependents: fs === 'hoh' || fs === 'qss' ? [kid(1)] : [],
      w2s: [w2(50_000)],
    }));
    expect(r.standardDeduction).toBe(want);
    expect(r.form1040['1z']).toBe(50_000);
    expect(r.form1040['15']).toBe(50_000 - want);
  });
});

describe('property: bracket-boundary ±$1 (taxable income)', () => {
  // Single ordinary brackets from Rev. Proc. 2024-40 § 3.01. Wage = TI + $15,750.
  const edges = [11_925, 48_475];
  it('crossing a 10/12 or 12/22 edge never lowers table tax', () => {
    for (const edge of edges) {
      const below = computeReturn(ret({ w2s: [w2(edge + 15_750 - 1)] }));
      const at = computeReturn(ret({ w2s: [w2(edge + 15_750)] }));
      const above = computeReturn(ret({ w2s: [w2(edge + 15_750 + 1)] }));
      expect(at.form1040['16']).toBeGreaterThanOrEqual(below.form1040['16']);
      expect(above.form1040['16']).toBeGreaterThanOrEqual(at.form1040['16']);
    }
  });

  it('Tax Table top vs Computation Worksheet: $99,999 vs $100,000 TI', () => {
    const table = computeReturn(ret({ w2s: [w2(99_999 + 15_750)] }));
    const ws = computeReturn(ret({ w2s: [w2(100_000 + 15_750)] }));
    expect(table.taxMethod).toBe('table');
    expect(ws.taxMethod).toBe('computation-worksheet');
    expect(ws.form1040['16']).toBeGreaterThanOrEqual(table.form1040['16']);
  });
});

describe('property: phase-out edges do not jump the wrong way', () => {
  it('CTC phase-out: $1 over $200,000 MAGI reduces the credit by $50', () => {
    const at = computeReturn(ret({ w2s: [w2(200_000)], dependents: [kid(1)] }));
    const over = computeReturn(ret({ w2s: [w2(200_001)], dependents: [kid(1)] }));
    expect(at.schedule8812['11']).toBe(0);
    expect(over.schedule8812['11']).toBe(50);
  });

  it('SALT cap is $40,000 at $500,000 AGI and $39,999.70→$40,000? $500,001 starts the 30% cut', () => {
    const at = computeReturn(ret({
      w2s: [w2(500_000)],
      itemized: { ...ret().itemized, stateLocalIncomeOrSalesTax: 50_000 },
    }));
    const over = computeReturn(ret({
      w2s: [w2(500_004)], // 30% × $4 = $1 after whole-dollar
      itemized: { ...ret().itemized, stateLocalIncomeOrSalesTax: 50_000 },
    }));
    expect(at.scheduleA['5e']).toBe(40_000);
    expect(over.scheduleA['5e']).toBeLessThan(40_000);
  });
});
