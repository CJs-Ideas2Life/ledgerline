import { describe, expect, it } from 'vitest';
import { blankReturn, completeAdult } from '../../src/engine';
import { DISCLAIMER_STORAGE_KEY } from '../../src/lib/disclaimer';
import {
  CLEAR_DATA_WARNING, STORAGE_KEY, blankInterview, clearAllLedgerlineData, clearState, exportStateJson, loadState, markCompleted, markVisited, saveState, uniqueSteps,
} from '../../src/lib/storage';

function memoryStore(overrides: Partial<Storage> = {}): Storage {
  const bag = new Map<string, string>();
  const store: Storage = {
    get length() { return bag.size; },
    clear() { bag.clear(); },
    getItem(k) { return bag.has(k) ? bag.get(k)! : null; },
    key(i) { return [...bag.keys()][i] ?? null; },
    removeItem(k) { bag.delete(k); },
    setItem(k, v) { bag.set(k, String(v)); },
    ...overrides,
  };
  return store;
}

const data = { ...blankReturn(), taxpayer: completeAdult({ firstName: 'Ada' }) };
const iv = blankInterview();

describe('saveState persisted vs failed', () => {
  it('returns persisted and a timestamp only after a successful write', () => {
    const store = memoryStore();
    const result = saveState(data, iv, store);
    expect(result.status).toBe('persisted');
    if (result.status === 'persisted') {
      expect(result.savedAt).toMatch(/^\d{4}-/);
      expect(store.getItem(STORAGE_KEY)).toContain('Ada');
    }
  });

  it('returns failed when setItem throws and does not invent a durable save', () => {
    const store = memoryStore({
      setItem() { throw Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' }); },
    });
    const result = saveState(data, iv, store);
    expect(result).toEqual({
      status: 'failed',
      error: expect.stringContaining('QuotaExceededError'),
    });
    expect(result.status === 'failed' && !('savedAt' in result)).toBe(true);
  });

  it('returns failed when storage access is missing', () => {
    const result = saveState(data, iv, null);
    expect(result.status).toBe('failed');
  });

  it('succeeds after a later retry on a working store', () => {
    let blows = true;
    const bag = new Map<string, string>();
    const store = memoryStore({
      getItem(k) { return bag.get(k) ?? null; },
      setItem(k, v) {
        if (blows) throw Object.assign(new Error('full'), { name: 'QuotaExceededError' });
        bag.set(k, String(v));
      },
    });
    expect(saveState(data, iv, store).status).toBe('failed');
    blows = false;
    const retry = saveState(data, iv, store);
    expect(retry.status).toBe('persisted');
    expect(loadState(store).status).toBe('ok');
  });
});

describe('loadState restore', () => {
  it('returns empty when nothing is stored', () => {
    expect(loadState(memoryStore()).status).toBe('empty');
  });

  it('rejects corrupt JSON', () => {
    const store = memoryStore();
    store.setItem(STORAGE_KEY, '{not-json');
    const loaded = loadState(store);
    expect(loaded.status).toBe('invalid');
    if (loaded.status === 'invalid') expect(loaded.errors.join(' ')).toMatch(/corrupt/);
  });

  it('rejects another tax year instead of relabeling it as 2025', () => {
    const store = memoryStore();
    store.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      data: { ...data, taxYear: 2024 },
      interview: iv,
      savedAt: '2024-01-01T00:00:00.000Z',
    }));
    const loaded = loadState(store);
    expect(loaded.status).toBe('invalid');
    if (loaded.status === 'invalid') expect(loaded.errors.join(' ')).toMatch(/2024/);
  });

  it('round-trips a valid save', () => {
    const store = memoryStore();
    const saved = saveState(data, markCompleted(markVisited(iv, 1), 0), store);
    expect(saved.status).toBe('persisted');
    const loaded = loadState(store);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.data.taxpayer.firstName).toBe('Ada');
      expect(loaded.interview.visited).toContain(1);
      expect(loaded.interview.completed).toContain(0);
    }
  });

  it('export JSON is portable recovery, not a claim that localStorage succeeded', () => {
    const json = exportStateJson(data, iv);
    expect(json).toContain('"version": 1');
    expect(json).toContain('Ada');
  });

  it('clearState removes the key', () => {
    const store = memoryStore();
    saveState(data, iv, store);
    clearState(store);
    expect(loadState(store).status).toBe('empty');
  });

  it('clearAllLedgerlineData removes the draft and the disclaimer acknowledgment', () => {
    const store = memoryStore();
    saveState(data, iv, store);
    store.setItem(DISCLAIMER_STORAGE_KEY, JSON.stringify({ acknowledgedAt: '2026-01-01T00:00:00.000Z' }));
    clearAllLedgerlineData(store);
    expect(loadState(store).status).toBe('empty');
    expect(store.getItem(DISCLAIMER_STORAGE_KEY)).toBeNull();
    expect(CLEAR_DATA_WARNING).toMatch(/plain text/i);
    expect(CLEAR_DATA_WARNING).toMatch(/Nothing is sent to a server/i);
  });

  it('never returns a saved timestamp when the write failed', () => {
    const store = memoryStore({
      setItem() { throw Object.assign(new Error('denied'), { name: 'SecurityError' }); },
    });
    const result = saveState(data, iv, store);
    expect(result.status).toBe('failed');
    expect(JSON.stringify(result)).not.toMatch(/savedAt/);
  });
});

describe('visited vs completed steps', () => {
  it('jumping ahead visits without completing skipped steps', () => {
    const jumped = markVisited(blankInterview(), 8);
    expect(jumped.visited).toEqual([0, 8]);
    expect(jumped.completed).toEqual([]);
    expect(uniqueSteps([8, 0, 8, -1])).toEqual([0, 8]);
  });
});
