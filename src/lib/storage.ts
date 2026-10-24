// SPDX-License-Identifier: AGPL-3.0-or-later
import { blankBusiness, blankDependent, blankReturn, blankW2, validateSavedInput, type TaxReturnInput } from '@/engine';
import { DISCLAIMER_STORAGE_KEY } from '@/lib/disclaimer';

export const STORAGE_KEY = 'ledgerline.ty2025.v1';
export const STORAGE_VERSION = 1 as const;

/** Shown before the user erases a draft. Storage is plaintext in this browser only. */
export const CLEAR_DATA_WARNING =
  'Erase every Ledgerline draft in this browser? Answers are stored as plain text in this browser only. Nothing is sent to a server. This cannot be undone.';

export interface Interview {
  step: number;
  /** Steps the user has opened. Distinct from completed. */
  visited: number[];
  /** Steps the user left via Continue (required facts reviewed). */
  completed: number[];
  hasW2: boolean | null;
  hasInvestments: boolean | null;
  hasBusiness: boolean | null;
  hasDependents: boolean | null;
}

export interface SavedState {
  version: 1;
  data: TaxReturnInput;
  interview: Interview;
  savedAt: string;
}

export type SaveResult =
  | { status: 'persisted'; savedAt: string }
  | { status: 'failed'; error: string };

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; data: TaxReturnInput; interview: Interview; savedAt: string }
  | { status: 'invalid'; errors: string[] };

export const blankInterview = (): Interview => ({
  step: 0,
  visited: [0],
  completed: [],
  hasW2: null,
  hasInvestments: null,
  hasBusiness: null,
  hasDependents: null,
});

export function sampleInterview(): Interview {
  return {
    step: 8,
    visited: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    completed: [0, 1, 2, 3, 4, 5, 6, 7],
    hasW2: true,
    hasInvestments: true,
    hasBusiness: true,
    hasDependents: true,
  };
}

export function uniqueSteps(xs: number[]): number[] {
  return [...new Set(xs.filter((n) => Number.isInteger(n) && n >= 0))].sort((a, b) => a - b);
}

export function markVisited(iv: Interview, step: number): Interview {
  return { ...iv, step, visited: uniqueSteps([...iv.visited, step]) };
}

export function markCompleted(iv: Interview, step: number): Interview {
  return { ...iv, completed: uniqueSteps([...iv.completed, step]) };
}

/**
 * Facts the user said they do not have stay in `data` as stale answers.
 * They are not passed to the engine until the branch is Yes again.
 */
export function activeInput(data: TaxReturnInput, iv: Interview): TaxReturnInput {
  return {
    ...data,
    dependents: iv.hasDependents === true ? data.dependents : [],
    w2s: iv.hasW2 === true ? data.w2s : [],
    interest: iv.hasInvestments === true ? data.interest : [],
    dividends: iv.hasInvestments === true ? data.dividends : [],
    capitalGains: iv.hasInvestments === true ? data.capitalGains : [],
    stLossCarryover: iv.hasInvestments === true ? data.stLossCarryover : 0,
    ltLossCarryover: iv.hasInvestments === true ? data.ltLossCarryover : 0,
    foreignAccount: iv.hasInvestments === true ? data.foreignAccount : false,
    foreignTrust: iv.hasInvestments === true ? data.foreignTrust : false,
    businesses: iv.hasBusiness === true ? data.businesses : [],
    qbiLossCarryforward: iv.hasBusiness === true ? data.qbiLossCarryforward : 0,
  };
}

function hydrate(d: Partial<TaxReturnInput>): TaxReturnInput {
  const b = blankReturn();
  return {
    ...b,
    ...d,
    taxpayer: { ...b.taxpayer, ...(d.taxpayer ?? {}) },
    spouse: { ...b.spouse, ...(d.spouse ?? {}) },
    itemized: { ...b.itemized, ...(d.itemized ?? {}) },
    dependents: (d.dependents ?? b.dependents).map((x) => ({ ...blankDependent(), ...x })),
    w2s: (d.w2s ?? b.w2s).map((x) => ({ ...blankW2(), ...x })),
    businesses: (d.businesses ?? b.businesses).map((x) => ({
      ...blankBusiness(),
      ...x,
      expenses: { ...blankBusiness().expenses, ...x.expenses },
      cogs: { ...blankBusiness().cogs, ...x.cogs },
    })),
    // Keep an omitted year as 2025. A different year is rejected before hydrate.
    taxYear: 2025,
  };
}

function normalizeInterview(raw: Partial<Interview> | undefined, fallbackStep = 0): Interview {
  const base = blankInterview();
  const step = Number.isInteger(raw?.step) ? Number(raw?.step) : fallbackStep;
  return {
    ...base,
    ...raw,
    step,
    visited: uniqueSteps(raw?.visited ?? [0, step]),
    completed: uniqueSteps(raw?.completed ?? []),
  };
}

export function loadState(storage?: Storage | null): LoadResult {
  const store = storage ?? (typeof window === 'undefined' ? null : window.localStorage);
  if (!store) return { status: 'empty' };
  let raw: string | null;
  try {
    raw = store.getItem(STORAGE_KEY);
  } catch {
    return { status: 'invalid', errors: ['This browser blocked reading saved work.'] };
  }
  if (!raw) return { status: 'empty' };
  try {
    const s = JSON.parse(raw) as Partial<SavedState>;
    if (s?.version !== STORAGE_VERSION || !s.data) {
      return { status: 'invalid', errors: ['Saved work is a different storage version and was not loaded.'] };
    }
    const checked = validateSavedInput(s.data);
    if (!checked.ok) return { status: 'invalid', errors: checked.errors };
    return {
      status: 'ok',
      data: hydrate(checked.data),
      interview: normalizeInterview(s.interview, typeof s.interview?.step === 'number' ? s.interview.step : 0),
      savedAt: typeof s.savedAt === 'string' ? s.savedAt : '',
    };
  } catch {
    return { status: 'invalid', errors: ['Saved work is corrupt and was not loaded.'] };
  }
}

export function saveState(data: TaxReturnInput, interview: Interview, storage?: Storage | null): SaveResult {
  const store = storage ?? (typeof window === 'undefined' ? null : window.localStorage);
  if (!store) return { status: 'failed', error: 'No browser storage is available. Work is only in memory until you export a copy.' };
  const savedAt = new Date().toISOString();
  const payload: SavedState = { version: STORAGE_VERSION, data, interview, savedAt };
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(payload));
    const roundTrip = store.getItem(STORAGE_KEY);
    if (!roundTrip) return { status: 'failed', error: 'The browser accepted the write but nothing was stored.' };
    return { status: 'persisted', savedAt };
  } catch (err) {
    const name = err instanceof Error ? err.name : 'Error';
    const msg = err instanceof Error ? err.message : 'Storage write failed.';
    return { status: 'failed', error: `${name}: ${msg}` };
  }
}

export function exportStateJson(data: TaxReturnInput, interview: Interview): string {
  const savedAt = new Date().toISOString();
  const payload: SavedState = { version: STORAGE_VERSION, data, interview, savedAt };
  return JSON.stringify(payload, null, 2);
}

export function clearState(storage?: Storage | null) {
  const store = storage ?? (typeof window === 'undefined' ? null : window.localStorage);
  try {
    store?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Erase the return draft and the disclaimer acknowledgment. */
export function clearAllLedgerlineData(storage?: Storage | null) {
  const store = storage ?? (typeof window === 'undefined' ? null : window.localStorage);
  try {
    store?.removeItem(STORAGE_KEY);
    store?.removeItem(DISCLAIMER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export const fmt = (n: number) =>
  (Number.isFinite(n) ? (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US') : '—');
