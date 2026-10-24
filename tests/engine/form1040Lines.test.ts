import { describe, expect, it } from 'vitest';
import { computeReturn } from '../../src/engine';
import { oracleCompute, type OracleInput } from '../../src/oracle/compute1040';
import { ret, w2 } from './helpers';

/**
 * Official 2025 Form 1040 page 1 totaling lines, transcribed from
 * https://www.irs.gov/pub/irs-prior/f1040--2025.pdf
 * sha256 3d31c226df0d189ced80e039d01cf0f8820c1019681a0f0ca6264de277b7e982
 *
 * Line 7a: Capital gain or (loss). Attach Schedule D if required. If not required,
 * check here [7b] and enter the amount from ... capital gain distributions.
 * Line 9: Add lines 1z, 2b, 3b, 4b, 5b, 6b, 7a, and 8. This is your total income.
 *
 * This schema is independent of engine labels / aliases.
 */
const OFFICIAL_2025_1040 = {
  taxYear: 2025,
  url: 'https://www.irs.gov/pub/irs-prior/f1040--2025.pdf',
  sha256: '3d31c226df0d189ced80e039d01cf0f8820c1019681a0f0ca6264de277b7e982',
  line9Inputs: ['1z', '2b', '3b', '4b', '5b', '6b', '7a', '8'] as const,
  unsupportedIncome: ['1b', '1c', '1d', '1e', '1f', '1g', '1h', '4a', '5a', '6a'],
};

function officialLine9(F: Record<string, number>): number {
  return OFFICIAL_2025_1040.line9Inputs.reduce((s, k) => s + (F[k] ?? 0), 0);
}

describe('2025 Form 1040 line 7a / line 9 official mapping', () => {
  it('records the official form identity', () => {
    expect(OFFICIAL_2025_1040.taxYear).toBe(2025);
    expect(OFFICIAL_2025_1040.line9Inputs).toEqual(['1z', '2b', '3b', '4b', '5b', '6b', '7a', '8']);
    expect(OFFICIAL_2025_1040.line9Inputs).not.toContain('7');
  });

  it('Schedule D long-term sale: 7a is the $10,000 gain and line 9 reconciles', () => {
    const input = ret({
      w2s: [w2(80_000)],
      capitalGains: [{
        id: 'lt', description: 'Stock', dateAcquired: '2020-01-01', dateSold: '2025-06-01',
        proceeds: 20_000, cost: 10_000, term: 'long', collectible: false, unrecaptured1250: false,
      }],
    });
    const r = computeReturn(input);
    const o = oracleCompute(input as unknown as OracleInput);
    expect(r.scheduleD['21']).toBe(10_000);
    expect(r.form1040['7a']).toBe(10_000);
    expect(r.form1040['7']).toBe(r.form1040['7a']);
    expect(r.form1040['9']).toBe(90_000);
    expect(r.form1040['9']).toBe(officialLine9(r.form1040));
    expect(o.form1040['7a']).toBe(10_000);
    expect(o.form1040[9]).toBe(90_000);
    expect(o.form1040[9]).toBe(officialLine9(o.form1040));
  });

  it('distributions only, no Schedule D: 7a is box 2a and is not double-counted', () => {
    const input = ret({
      w2s: [w2(60_000)],
      dividends: [{ id: 'd', payer: 'Fund', ordinary: 100, qualified: 0, capitalGainDistributions: 500, federalWithholding: 0 }],
    });
    const r = computeReturn(input);
    expect(r.form1040['7a']).toBe(500);
    expect(r.form1040['9']).toBe(60_600);
    expect(r.form1040['9']).toBe(officialLine9(r.form1040));
    expect(r.form1040['11b']).toBe(60_600);
  });

  it('mixed trades and distributions: 7a is Schedule D line 21 once', () => {
    const input = ret({
      w2s: [w2(50_000)],
      dividends: [{ id: 'd', payer: 'Fund', ordinary: 0, qualified: 0, capitalGainDistributions: 400, federalWithholding: 0 }],
      capitalGains: [{
        id: 'st', description: 'ST', dateAcquired: '2025-01-01', dateSold: '2025-03-01',
        proceeds: 500, cost: 200, term: 'short', collectible: false, unrecaptured1250: false,
      }],
    });
    const r = computeReturn(input);
    expect(r.scheduleD['13']).toBe(400);
    expect(r.scheduleD['21']).toBe(700);
    expect(r.form1040['7a']).toBe(700);
    expect(r.form1040['9']).toBe(50_700);
    expect(r.form1040['9']).toBe(officialLine9(r.form1040));
  });

  it('net capital loss: 7a is the allowed loss', () => {
    const input = ret({
      w2s: [w2(50_000)],
      capitalGains: [{
        id: 'loss', description: 'Loss', dateAcquired: '2024-01-01', dateSold: '2025-06-01',
        proceeds: 1_000, cost: 10_000, term: 'long', collectible: false, unrecaptured1250: false,
      }],
    });
    const r = computeReturn(input);
    expect(r.form1040['7a']).toBe(-3_000);
    expect(r.form1040['9']).toBe(47_000);
    expect(r.form1040['9']).toBe(officialLine9(r.form1040));
  });

  it('zero case: no capital items → 7a is 0', () => {
    const r = computeReturn(ret({ w2s: [w2(40_000)] }));
    expect(r.form1040['7a']).toBe(0);
    expect(r.form1040['9']).toBe(officialLine9(r.form1040));
  });
});
