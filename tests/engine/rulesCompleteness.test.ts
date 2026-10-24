import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as constants from '../../src/engine/constants2025';
import { computeReturn, sampleReturn } from '../../src/engine';
import { ENGINE_STEP_IDS, RULES, RULE_BY_ID } from '../../src/engine/rules';

const SKIP_CONSTANTS = new Set(['SOURCES']);

function exportedConstantNames(): string[] {
  return Object.keys(constants).filter((k) => SKIP_CONSTANTS.has(k) === false && k === k.toUpperCase());
}

describe('rules registry completeness', () => {
  it('every rule has an id, citations, and classification', () => {
    const ids = new Set<string>();
    for (const r of RULES) {
      expect(r.id, 'id').toMatch(/^[a-z0-9-]+$/);
      expect(ids.has(r.id), `duplicate ${r.id}`).toBe(false);
      ids.add(r.id);
      expect(r.topic.length).toBeGreaterThan(3);
      expect(r.form.length).toBeGreaterThan(0);
      expect(r.formLine.length).toBeGreaterThan(0);
      expect(r.rule.length).toBeGreaterThan(20);
      expect(r.reason.length).toBeGreaterThan(20);
      expect(r.citations.length, `${r.id} citations`).toBeGreaterThan(0);
      for (const c of r.citations) {
        expect(c.ref.length, `${r.id} citation`).toBeGreaterThan(5);
      }
      expect(['stable', 'annual']).toContain(r.classification);
      expect(r.appliesTo.length, `${r.id} appliesTo`).toBeGreaterThan(0);
      if (r.classification === 'annual' && r.parameterKey) {
        expect(r.sourceUrl, `${r.id} sourceUrl`).toMatch(/^https?:\/\//);
        expect(r.indexing, `${r.id} indexing`).toBeTruthy();
        expect(r.sunset, `${r.id} sunset`).toBeTruthy();
        expect([true, false, 'partial']).toContain(r.verified);
      }
    }
  });

  it('every constants2025.ts export has a registry entry and a citation', () => {
    const covered = new Set<string>();
    for (const r of RULES) {
      for (const name of r.constants ?? []) covered.add(name);
    }
    const missing: string[] = [];
    for (const name of exportedConstantNames()) {
      if (!covered.has(name)) missing.push(name);
    }
    expect(missing, `constants without a registry entry: ${missing.join(', ')}`).toEqual([]);
    for (const name of exportedConstantNames()) {
      const entry = RULES.find((r) => r.constants?.includes(name));
      expect(entry?.citations.length, `${name} citation`).toBeGreaterThan(0);
    }
  });

  it('every engine step has a registry entry and a citation', () => {
    const missing: string[] = [];
    for (const id of ENGINE_STEP_IDS) {
      const r = RULE_BY_ID[id];
      if (!r || r.citations.length === 0) missing.push(id);
    }
    expect(missing, `steps without a cited registry entry: ${missing.join(', ')}`).toEqual([]);
  });

  it('computeReturn traces only cited registry ids and covers every engine step', () => {
    const result = computeReturn(sampleReturn());
    expect(result.trace.length).toBeGreaterThan(20);
    const seen = new Set<string>();
    for (const s of result.trace) {
      expect(s.ruleIds.length, `${s.form} ${s.line}`).toBeGreaterThan(0);
      for (const id of s.ruleIds) {
        const r = RULE_BY_ID[id];
        expect(r, `unknown rule ${id} on ${s.form} ${s.line}`).toBeTruthy();
        expect(r.citations.length, id).toBeGreaterThan(0);
        seen.add(id);
      }
    }
    const missing = ENGINE_STEP_IDS.filter((id) => !seen.has(id));
    expect(missing, `engine steps never recorded on a trace: ${missing.join(', ')}`).toEqual([]);
  });

  it('engine source files do not introduce uncited numeric tax constants', () => {
    // Guardrail: a new exported constant in constants2025.ts must be listed above.
    // Also fail if a module in src/engine (except constants, rules, money) grows a
    // bare `export const SOME_TAX = 12345` that bypasses the registry.
    const dir = join(process.cwd(), 'src', 'engine');
    const files = readdirSync(dir).filter((f) => f.endsWith('.ts'));
    const offenders: string[] = [];
    for (const f of files) {
      if (f === 'constants2025.ts') continue;
      const src = readFileSync(join(dir, f), 'utf8');
      const re = /^export const ([A-Z][A-Z0-9_]+) = /gm;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) offenders.push(`${f}:${m[1]}`);
    }
    expect(offenders, `move these annual/stable figures into constants2025.ts + the registry: ${offenders.join(', ')}`).toEqual([]);
  });
});
