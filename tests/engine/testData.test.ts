import { describe, expect, it } from 'vitest';
import { computeReturn, type Lines } from '../../src/engine';
import { getPath, loadTestCases } from '../../src/lib/cases';

const cases = loadTestCases();

describe('test-data library', () => {
  it('has at least 150 cases', () => {
    expect(cases.length).toBeGreaterThanOrEqual(150);
  });

  it.each(cases)('$file', (raw) => {
    expect(raw.id, 'id').toBeTruthy();
    expect(raw.description.length, 'description').toBeGreaterThan(20);
    expect(raw.derivation.length, 'derivation').toBeGreaterThan(20);
    expect(raw.expected && Object.keys(raw.expected).length, 'expected').toBeGreaterThan(0);

    const result = computeReturn(raw.data);
    const bag = result as unknown as Record<string, unknown>;

    for (const [key, want] of Object.entries(raw.expected)) {
      if (key === 'warningsIncludes') {
        const needles = want as string[];
        for (const n of needles) {
          expect(result.warnings.some((w) => w.message.includes(n)), `warning includes "${n}"`).toBe(true);
        }
        continue;
      }
      if (want && typeof want === 'object' && !Array.isArray(want)) {
        const lines = getPath(bag, key) as Lines | undefined;
        expect(lines, key).toBeTruthy();
        for (const [line, val] of Object.entries(want as Record<string, number | string>)) {
          if (val === 'GT0') expect(lines![line], `${key} line ${line} > 0`).toBeGreaterThan(0);
          else expect(lines![line], `${key} line ${line}`).toBe(val);
        }
      } else {
        expect(getPath(bag, key), key).toBe(want);
      }
    }
  });
});
