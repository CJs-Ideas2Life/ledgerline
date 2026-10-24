import { describe, expect, it } from 'vitest';
import { computeReturn, sampleReturn, type TaxResult } from '../../src/engine';
import { loadTestCases } from '../../src/lib/cases';

/** Integer line maps + cash settlement. Excludes warning text and float rates. */
export function canonical(r: TaxResult): string {
  const pick = (lines: Record<string, number> | null | undefined) => {
    if (!lines) return null;
    const out: Record<string, number> = {};
    for (const k of Object.keys(lines).sort()) {
      const v = lines[k];
      if (typeof v === 'number') {
        expect(Number.isInteger(v) || k === 'effectiveRate', `non-integer ${k}=${v}`).toBe(true);
        out[k] = v;
      }
    }
    return out;
  };
  return JSON.stringify({
    form1040: pick(r.form1040),
    schedule1: pick(r.schedule1),
    schedule1A: pick(r.schedule1A),
    schedule2: pick(r.schedule2),
    scheduleA: pick(r.scheduleA),
    scheduleB: pick(r.scheduleB),
    scheduleD: pick(r.scheduleD),
    schedule8812: pick(r.schedule8812),
    form8995: pick(r.form8995),
    form8995A: pick(r.form8995A ?? undefined),
    form6251: pick(r.form6251),
    form4952: pick(r.form4952),
    form2210: pick(r.form2210),
    form8959: pick(r.form8959),
    form8960: pick(r.form8960),
    scheduleC: r.scheduleC.map((c) => pick(c.lines)),
    scheduleSE: r.scheduleSE.map((s) => pick(s.lines)),
    standardDeduction: r.standardDeduction,
    itemizedDeduction: r.itemizedDeduction,
    usesItemized: r.usesItemized,
    taxMethod: r.taxMethod,
    refund: r.refund,
    amountOwed: r.amountOwed,
  });
}

function shuffle<T>(xs: T[], seed: number): T[] {
  const a = xs.slice();
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

describe('determinism', () => {
  it('sample return is byte-identical on a second run', () => {
    const input = sampleReturn();
    expect(canonical(computeReturn(input))).toBe(canonical(computeReturn(input)));
  });

  it('every library case is byte-identical twice', () => {
    for (const c of loadTestCases()) {
      const a = canonical(computeReturn(c.data));
      const b = canonical(computeReturn(c.data));
      expect(a, c.id).toBe(b);
    }
  });

  it('shuffling W-2s, 1099s, dependents, and businesses does not change totals', () => {
    const base = sampleReturn();
    base.w2s = [...base.w2s, { ...base.w2s[0], id: 'w2-extra', wages: 12_000, federalWithholding: 1_200, socialSecurityWages: 12_000, socialSecurityTax: 744, medicareWages: 12_000, medicareTax: 174 }];
    const once = computeReturn(base);
    const shuffled = computeReturn({
      ...base,
      w2s: shuffle(base.w2s, 7),
      interest: shuffle(base.interest, 11),
      dividends: shuffle(base.dividends, 13),
      dependents: shuffle(base.dependents, 17),
      businesses: shuffle(base.businesses, 19),
    });
    expect(JSON.stringify(shuffled.form1040)).toBe(JSON.stringify(once.form1040));
    expect(shuffled.refund).toBe(once.refund);
    expect(shuffled.amountOwed).toBe(once.amountOwed);
    expect(shuffled.standardDeduction).toBe(once.standardDeduction);
    expect(shuffled.itemizedDeduction).toBe(once.itemizedDeduction);
  });
});
