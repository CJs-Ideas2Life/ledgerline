import { describe, expect, it } from 'vitest';
import { computeReturn, earnedIncomeCredit, eicStatutoryAt, eicTableLookup, eicTableMidpoint, type Warning } from '../../src/engine';
import { kid, ret, unansweredRet, w2 } from './helpers';
import table from './eicTable2025.json';

const COLS: { offset: number; children: 0 | 1 | 2 | 3; joint: boolean }[] = [
  { offset: 0, children: 0, joint: false },
  { offset: 1, children: 1, joint: false },
  { offset: 2, children: 2, joint: false },
  { offset: 3, children: 3, joint: false },
  { offset: 4, children: 0, joint: true },
  { offset: 5, children: 1, joint: true },
  { offset: 6, children: 2, joint: true },
  { offset: 7, children: 3, joint: true },
];

describe('2025 official EIC table (i1040gi--2025.pdf)', () => {
  it('records tax year, IRS source URL and SHA-256', () => {
    expect(table.source.taxYear).toBe(2025);
    expect(table.source.url).toBe('https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf');
    expect(table.source.sha256).toBe('482e9c487c608f1bbeaceef35bc3c0933e8b35443cfff447e4279d590468364a');
    expect(table.rows.length).toBe(1374);
  });

  it('matches every ordinary printed cell (both groups, 0–3 children, row boundaries)', () => {
    const mismatches: string[] = [];
    let compared = 0;
    for (const row of table.rows) {
      const lo = row[0] as number;
      const hi = row[1] as number;
      const credits = row.slice(2) as (number | null)[];
      for (const col of COLS) {
        const expected = credits[col.offset];
        if (expected == null) continue;
        for (const probe of [lo, hi - 1]) {
          if (probe < lo) continue;
          const got = eicTableLookup(probe, col.children, col.joint);
          compared += 1;
          if (got !== expected) mismatches.push(`${probe} ${col.joint ? 'joint' : 'other'}/${col.children}: got ${got} want ${expected}`);
        }
      }
    }
    expect(compared).toBeGreaterThan(10_000);
    expect(mismatches.slice(0, 12)).toEqual([]);
  });

  it('matches starred leftover terminals and $0 at the official cutoff', () => {
    for (const fn of table.footnotes) {
      const children = fn.children as 0 | 1 | 2 | 3;
      expect(eicTableLookup(fn.lo, children, fn.joint), `${fn.lo} leftover`).toBe(fn.credit);
      expect(eicTableLookup(fn.atOrAbove - 1, children, fn.joint), `${fn.atOrAbove - 1} leftover`).toBe(fn.credit);
      expect(eicTableLookup(fn.atOrAbove, children, fn.joint), `${fn.atOrAbove} cutoff`).toBe(0);
    }
  });

  it('reproduces the independently extracted mismatch examples', () => {
    expect(eicTableLookup(8_450, 0, false)).toBe(649);
    expect(eicTableLookup(12_700, 1, false)).toBe(4_328);
    expect(eicTableLookup(17_850, 2, false)).toBe(7_152);
    expect(eicTableLookup(17_850, 3, false)).toBe(8_046);
    expect(eicTableLookup(50_400, 1, false)).toBe(3);
    expect(eicTableLookup(50_434, 1, false)).toBe(0);
    expect(eicTableLookup(64_400, 2, true)).toBe(3);
    expect(eicTableLookup(64_430, 2, true)).toBe(0);
    expect(eicTableLookup(68_650, 3, true)).toBe(3);
  });

  it('first row is $1–$50; a $1 move inside a band does not change the credit', () => {
    expect(eicTableMidpoint(1, 19_104)).toBe(25.5);
    expect(eicTableLookup(8_000, 0, false)).toBe(eicTableLookup(8_049, 0, false));
    expect(eicTableLookup(30_000, 2, false)).toBe(eicTableLookup(30_049, 2, false));
    expect(eicTableLookup(30_000, 2, false)).toBe(5_746);
    expect(eicStatutoryAt(30_000, 2, false)).toBe(5_752);
  });

  it('earned-income vs AGI comparison is separate from the lookup', () => {
    const input = ret({ w2s: [w2(8_000)], interest: [{ id: 'i', payer: 'Bank', taxable: 8_000, taxExempt: 0, federalWithholding: 0 }] });
    const warnings: Warning[] = [];
    const res = earnedIncomeCredit(input, 16_000, 8_000, 8_000, warnings);
    expect(res.lines.fromEarned).toBe(eicTableLookup(8_000, 0, false));
    expect(res.lines.fromAgi).toBe(eicTableLookup(16_000, 0, false));
    expect(res.credit).toBe(Math.min(res.lines.fromEarned, res.lines.fromAgi));
    expect(res.credit).toBeLessThan(res.lines.fromEarned);
    expect(res.credit).toBe(res.lines.fromAgi);
  });

  it('transfers the looked-up credit onto Form 1040 line 27a when eligibility is complete', () => {
    const r = computeReturn(ret({ w2s: [w2(8_000)] }));
    expect(r.form1040['27a']).toBe(614);
    expect(r.scope.status).toBe('complete');
  });

  it('does not treat unanswered eligibility as an EIC award', () => {
    const r = computeReturn(unansweredRet({ w2s: [w2(8_000)] }));
    expect(r.form1040['27a']).toBe(0);
    expect(r.refund).toBe(0);
    expect(r.scope.status).toBe('incomplete');
  });
});
