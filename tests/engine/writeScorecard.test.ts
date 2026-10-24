import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { writeScorecard } from '../../src/oracle/scorecard';

describe('accuracy scorecard', () => {
  it('writes SCORECARD.md and scorecard.json for every library case', () => {
    const s = writeScorecard();
    const dir = join(process.cwd(), 'test-data');
    expect(existsSync(join(dir, 'SCORECARD.md'))).toBe(true);
    expect(existsSync(join(dir, 'scorecard.json'))).toBe(true);
    const md = readFileSync(join(dir, 'SCORECARD.md'), 'utf8');
    expect(md).toContain('accuracy scorecard');
    expect(s.cases).toBeGreaterThanOrEqual(80);
    expect(s.linesCompared).toBeGreaterThan(0);
    // Report is informational: remaining mismatches are listed in SCORECARD.md.
    expect(s.overallPct).toBeGreaterThanOrEqual(90);
    console.log(`scorecard ${s.casePass}/${s.cases} cases, ${s.overallPct}% lines`);
  });
});
