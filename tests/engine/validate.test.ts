import { describe, expect, it } from 'vitest';
import {
  buildScope, computeReturn, parseMoneyInput, unsupportedFacts, validateMoneyFields, validateSavedInput,
} from '../../src/engine';
import { ret, w2 } from './helpers';

describe('parseMoneyInput', () => {
  it('treats empty as explicit zero', () => {
    expect(parseMoneyInput('')).toEqual({ ok: true, value: 0 });
    expect(parseMoneyInput(null)).toEqual({ ok: true, value: 0 });
  });

  it('rejects NaN, Infinity, negatives, and trailing junk', () => {
    expect(parseMoneyInput(Number.NaN).ok).toBe(false);
    expect(parseMoneyInput(Number.POSITIVE_INFINITY).ok).toBe(false);
    expect(parseMoneyInput(-40_000).ok).toBe(false);
    expect(parseMoneyInput('40000oops').ok).toBe(false);
    expect(parseMoneyInput('40000oops')).toMatchObject({ error: expect.stringMatching(/number only/i) });
  });

  it('accepts a plain amount and optional negatives', () => {
    expect(parseMoneyInput('40,000')).toEqual({ ok: true, value: 40_000 });
    expect(parseMoneyInput(-3_000, { allowNegative: true })).toEqual({ ok: true, value: -3_000 });
  });
});

describe('runtime saved-state validation', () => {
  it('does not relabel another tax year as 2025', () => {
    const r = validateSavedInput({ taxYear: 2024, filingStatus: 'single' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(' ')).toMatch(/tax year 2024/);
  });

  it('rejects an unsupported filing status', () => {
    const r = validateSavedInput({ taxYear: 2025, filingStatus: 'married' });
    expect(r.ok).toBe(false);
  });

  it('flags NaN wages as invalid facts', () => {
    const input = ret({ w2s: [w2(Number.NaN)] });
    expect(validateMoneyFields(input).some((e) => e.includes('wages'))).toBe(true);
    const scope = buildScope(input, [], []);
    expect(scope.status).toBe('invalid');
  });
});

describe('supported-or-blocked scope gate', () => {
  it('collectibles block a complete result', () => {
    const input = ret({
      w2s: [w2(80_000)],
      capitalGains: [{
        id: 'gold', description: 'Gold', dateAcquired: '2020-01-01', dateSold: '2025-06-01',
        proceeds: 6_000, cost: 2_000, term: 'long', collectible: true, unrecaptured1250: false,
      }],
    });
    const r = computeReturn(input);
    expect(unsupportedFacts(input).some((s) => s.includes('Collectibles'))).toBe(true);
    expect(r.scope.status).toBe('blocked');
    expect(r.scope.unsupportedFacts.length).toBeGreaterThan(0);
    expect(r.warnings.some((w) => w.level === 'unsupported')).toBe(true);
  });

  it('unrecaptured §1250 and foreign facts also block', () => {
    expect(unsupportedFacts(ret({
      capitalGains: [{
        id: 'r', description: 'Rental', dateAcquired: '2010-01-01', dateSold: '2025-06-01',
        proceeds: 100_000, cost: 40_000, term: 'long', collectible: false, unrecaptured1250: true,
      }],
    })).some((s) => s.includes('1250'))).toBe(true);
    expect(unsupportedFacts(ret({ foreignAccount: true })).some((s) => s.includes('foreign financial'))).toBe(true);
    expect(unsupportedFacts(ret({ foreignTrust: true })).some((s) => s.includes('foreign trust'))).toBe(true);
  });

  it('a completed in-scope wage return is complete', () => {
    const r = computeReturn(ret({ w2s: [w2(50_000, 6_000)] }));
    expect(r.scope.status).toBe('complete');
    expect(r.refund).toBeGreaterThan(0);
  });
});
