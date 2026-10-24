// SPDX-License-Identifier: AGPL-3.0-or-later
import { CAPITAL_LOSS_LIMIT, CAPITAL_LOSS_LIMIT_MFS } from './constants2025';
import { amt, dollars, pos } from './money';
import type { CapitalGainTrade, Form8949Result, Lines, TaxReturnInput, Warning } from './types';

function classifyTerm(t: CapitalGainTrade): 'short' | 'long' {
  if (t.term === 'short' || t.term === 'long') return t.term;
  const a = Date.parse(t.dateAcquired);
  const s = Date.parse(t.dateSold);
  if (!Number.isFinite(a) || !Number.isFinite(s)) return 'short';
  const yearMs = 365 * 24 * 60 * 60 * 1000;
  // More than one year: long-term (§ 1222). Using 365 days is a simplification of the calendar-date rule.
  return s - a > yearMs ? 'long' : 'short';
}

export function form8949(trades: CapitalGainTrade[]): Form8949Result[] {
  return trades.map((t) => {
    const proceeds = amt(t.proceeds);
    const cost = amt(t.cost);
    return {
      id: t.id,
      description: t.description,
      term: classifyTerm(t),
      proceeds,
      cost,
      gain: dollars(proceeds - cost),
      collectible: t.collectible,
      unrecaptured1250: t.unrecaptured1250,
    };
  });
}

export function scheduleD(
  input: TaxReturnInput,
  capGainDistributions: number,
  warnings: Warning[],
): { lines: Lines; form8949: Form8949Result[]; preferentialGain: number } {
  const rows = form8949(input.capitalGains);
  const l: Lines = {};
  const stRows = rows.filter((r) => r.term === 'short');
  const ltRows = rows.filter((r) => r.term === 'long');
  l['1a'] = stRows.reduce((s, r) => s + r.proceeds, 0);
  l['1b'] = stRows.reduce((s, r) => s + r.cost, 0);
  l['7d'] = stRows.reduce((s, r) => s + r.gain, 0);
  l['6'] = -amt(input.stLossCarryover);
  l['7'] = l['7d'] + l['6'];
  l['8a'] = ltRows.reduce((s, r) => s + r.proceeds, 0);
  l['8b'] = ltRows.reduce((s, r) => s + r.cost, 0);
  l['13'] = amt(capGainDistributions);
  l['14'] = -amt(input.ltLossCarryover);
  l['15'] = ltRows.reduce((s, r) => s + r.gain, 0) + l['13'] + l['14'];
  l['16'] = l['7'] + l['15'];
  const mfs = input.filingStatus === 'mfs';
  const lossLimit = mfs ? CAPITAL_LOSS_LIMIT_MFS : CAPITAL_LOSS_LIMIT;
  if (l['16'] < 0) {
    l['21'] = -Math.min(lossLimit, -l['16']);
  } else {
    l['21'] = l['16'];
  }
  // Line 21 is the amount on Form 1040 line 7 (gain or allowed loss).
  const remainingLoss = l['16'] < 0 ? -l['16'] + l['21'] : 0;
  // Carryover: ST first, then LT (Schedule D instructions, Capital Loss Carryover Worksheet).
  let stNext = 0;
  let ltNext = 0;
  if (remainingLoss > 0) {
    const stLoss = l['7'] < 0 ? -l['7'] : 0;
    const used = -l['21'];
    const usedFromSt = Math.min(stLoss, used);
    stNext = pos(stLoss - usedFromSt);
    ltNext = remainingLoss - stNext;
  } else {
    // Unused loss character when there is a net gain: no carryover.
    stNext = 0;
    ltNext = 0;
  }
  l['carrySt'] = stNext;
  l['carryLt'] = ltNext;

  const hasSales = rows.length > 0 || amt(input.stLossCarryover) > 0 || amt(input.ltLossCarryover) > 0;
  if (rows.some((r) => r.collectible)) {
    warnings.push({
      level: 'unsupported',
      message:
        'Collectibles (28% rate group) are included in Schedule D but taxed at the ordinary 0/15/20% qualified-dividend rates. The 28% Rate Gain Worksheet is not computed.',
    });
  }
  if (rows.some((r) => r.unrecaptured1250)) {
    warnings.push({
      level: 'unsupported',
      message:
        'Unrecaptured section 1250 gain is included in Schedule D but the 25% Unrecaptured Section 1250 Gain Worksheet is not computed.',
    });
  }
  if (hasSales)
    warnings.push({ level: 'info', message: 'Schedule D and Form 8949 are required for these capital-asset sales.' });

  // Preferential amount for the QDCG worksheet: smaller of Sch. D line 15 or 16, not less than zero
  // (QDCG worksheet line 3 when Schedule D is required).
  const preferentialGain = hasSales ? pos(Math.min(l['15'], l['16'])) : amt(capGainDistributions);
  return { lines: l, form8949: rows, preferentialGain };
}

export function scheduleDRequired(input: TaxReturnInput): boolean {
  return input.capitalGains.length > 0 || amt(input.stLossCarryover) > 0 || amt(input.ltLossCarryover) > 0;
}
