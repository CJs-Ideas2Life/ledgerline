// SPDX-License-Identifier: AGPL-3.0-or-later
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  blankBusiness, blankDividend, blankInterest, blankReturn, blankTrade, blankW2,
  completeAdult, packDependent,
  type Person, type TaxReturnInput,
} from '../engine';

export interface TestCaseFile {
  id: string;
  category: string;
  description: string;
  derivation: string;
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
}

export interface HydratedCase extends TestCaseFile {
  file: string;
  data: TaxReturnInput;
}

function mergeDeep<T>(base: T, over: unknown): T {
  if (over === undefined || over === null) return base;
  if (Array.isArray(over)) return over as T;
  if (typeof over !== 'object' || typeof base !== 'object' || base === null || Array.isArray(base)) return over as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    out[k] = mergeDeep((base as Record<string, unknown>)[k], v);
  }
  return out as T;
}

function packHydratePerson(raw: unknown): Person {
  const over = (raw ?? {}) as Partial<Person>;
  const senior = over.bornBefore1961 === true;
  const base = completeAdult({
    dateOfBirth: senior ? '1955-01-01' : '1990-06-15',
    ageAtYearEnd: senior ? 70 : 35,
    bornBefore1961: senior ? true : false,
  });
  return mergeDeep(base, over);
}

/**
 * Test-pack hydration: omitted eligibility is treated as a completed interview
 * (the 165 cases are complete households). The live `blankReturn()` starts unanswered.
 */
export function hydrateInput(raw: Record<string, unknown>): TaxReturnInput {
  const input = mergeDeep(blankReturn(), raw) as TaxReturnInput;
  input.taxYear = 2025;
  input.taxpayer = packHydratePerson(input.taxpayer);
  input.spouse = packHydratePerson(input.spouse);
  if (raw.canBeClaimedAsDependent === undefined) input.canBeClaimedAsDependent = false;
  if (raw.mfsLivedApart === undefined) input.mfsLivedApart = false;
  if (raw.spouseItemizes === undefined) input.spouseItemizes = false;
  input.itemized = mergeDeep(blankReturn().itemized, input.itemized);
  input.w2s = (input.w2s ?? []).map((w) => mergeDeep(blankW2(), w));
  input.interest = (input.interest ?? []).map((x) => mergeDeep(blankInterest(), x));
  input.dividends = (input.dividends ?? []).map((x) => mergeDeep(blankDividend(), x));
  input.dependents = (input.dependents ?? []).map((x) => mergeDeep(packDependent(), x));
  input.businesses = (input.businesses ?? []).map((x) => {
    const b = mergeDeep(blankBusiness(), x);
    b.expenses = mergeDeep(blankBusiness().expenses, x.expenses);
    b.cogs = mergeDeep(blankBusiness().cogs, x.cogs);
    return b;
  });
  input.capitalGains = (input.capitalGains ?? []).map((x) => mergeDeep(blankTrade(), x));
  return input;
}

export function casesDir(): string {
  return join(process.cwd(), 'test-data', 'cases');
}

export function loadTestCases(): HydratedCase[] {
  const dir = casesDir();
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((file) => {
      const raw = JSON.parse(readFileSync(join(dir, file), 'utf8')) as TestCaseFile;
      return { ...raw, file, data: hydrateInput(raw.input) };
    });
}

export function getPath(result: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = result;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}
