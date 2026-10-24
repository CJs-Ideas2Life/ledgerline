// SPDX-License-Identifier: AGPL-3.0-or-later
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { computeReturn, type Lines } from '../engine';
import { loadTestCases, type HydratedCase } from '../lib/cases';
import { oracleCompute, type OracleInput } from './compute1040';

export const MODULES = [
  'form1040', 'schedule1', 'schedule1A', 'schedule2', 'scheduleA', 'scheduleB',
  'scheduleD', 'schedule8812', 'form8995', 'form8995A', 'form6251', 'form4952',
  'form2210', 'form8959', 'form8960',
] as const;

export interface LineCompare {
  module: string;
  line: string;
  engine: number | string | null;
  oracle: number | string | null;
  ok: boolean;
}

export interface CaseScore {
  id: string;
  category: string;
  pass: boolean;
  compared: number;
  matched: number;
  mismatches: LineCompare[];
  moduleCounts: Record<string, { compared: number; matched: number }>;
}

export interface ModuleScore {
  module: string;
  compared: number;
  matched: number;
  pct: number;
}

export interface Scorecard {
  generatedAt: string;
  oracle: string;
  cases: number;
  casePass: number;
  caseFail: number;
  linesCompared: number;
  linesMatched: number;
  overallPct: number;
  modules: ModuleScore[];
  perCase: CaseScore[];
}

function asLines(x: unknown): Lines | null {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
  return x as Lines;
}

function skipLine(line: string): boolean {
  return line.startsWith('carry') || line.startsWith('biz') || line.startsWith('q')
    || line === 'phaseInPct' || line === 'sstbPct' || line === 'kids' || line === 'earned'
    || line === 'agi' || line === 'invest' || line === 'beforePhase' || line === 'phaseStart'
    || line === 'reduction' || line === 'credit' || line === 'wh' || line === 'est';
}

export function compareCase(c: HydratedCase): CaseScore {
  const engine = computeReturn(c.data);
  const oracle = oracleCompute(c.data as unknown as OracleInput);
  const mismatches: LineCompare[] = [];
  const moduleCounts: Record<string, { compared: number; matched: number }> = {};

  const bump = (module: string, line: string, ev: number | string | null, ov: number | string | null, ok: boolean) => {
    const cur = moduleCounts[module] ?? { compared: 0, matched: 0 };
    cur.compared += 1;
    if (ok) cur.matched += 1;
    moduleCounts[module] = cur;
    if (!ok) mismatches.push({ module, line, engine: ev, oracle: ov, ok });
  };

  const check = (module: string, e: Lines | null, o: Lines | null) => {
    if (!e || !o) return;
    // Compare only lines both implementations computed. The oracle is a
    // simpler instruction walk and does not always fill worksheet scratch lines.
    const keys = Object.keys(e).filter((k) => Object.prototype.hasOwnProperty.call(o, k));
    for (const line of keys.sort()) {
      const ev = e[line];
      const ov = o[line];
      if (typeof ev !== 'number' || typeof ov !== 'number') continue;
      if (skipLine(line)) continue;
      bump(module, line, ev, ov, ev === ov);
    }
  };

  for (const m of MODULES) {
    check(m, asLines((engine as unknown as Record<string, unknown>)[m]), asLines((oracle as unknown as Record<string, unknown>)[m]));
  }
  if (engine.scheduleC[0] && oracle.scheduleC[0]) check('scheduleC', engine.scheduleC[0].lines, oracle.scheduleC[0]);
  if (engine.scheduleSE[0] && oracle.scheduleSE[0]) check('scheduleSE', engine.scheduleSE[0].lines, oracle.scheduleSE[0]);
  if (engine.qdcgWorksheet && oracle.qdcgWorksheet) check('qdcgWorksheet', engine.qdcgWorksheet, oracle.qdcgWorksheet);

  bump('totals', 'standardDeduction', engine.standardDeduction, oracle.standardDeduction, engine.standardDeduction === oracle.standardDeduction);
  bump('totals', 'itemizedDeduction', engine.itemizedDeduction, oracle.itemizedDeduction, engine.itemizedDeduction === oracle.itemizedDeduction);
  bump('totals', 'refund', engine.refund, oracle.refund, engine.refund === oracle.refund);
  bump('totals', 'amountOwed', engine.amountOwed, oracle.amountOwed, engine.amountOwed === oracle.amountOwed);
  bump('totals', 'taxMethod', engine.taxMethod, oracle.taxMethod, engine.taxMethod === oracle.taxMethod);
  bump('totals', 'usesItemized', engine.usesItemized ? 1 : 0, oracle.usesItemized ? 1 : 0, engine.usesItemized === oracle.usesItemized);

  const compared = Object.values(moduleCounts).reduce((a, b) => a + b.compared, 0);
  const matched = Object.values(moduleCounts).reduce((a, b) => a + b.matched, 0);
  return { id: c.id, category: c.category, pass: mismatches.length === 0, compared, matched, mismatches, moduleCounts };
}

export function buildScorecard(): Scorecard {
  const cases = loadTestCases();
  const perCase = cases.map(compareCase);
  const bag = new Map<string, { compared: number; matched: number }>();
  for (const c of perCase) {
    for (const [module, v] of Object.entries(c.moduleCounts)) {
      const cur = bag.get(module) ?? { compared: 0, matched: 0 };
      cur.compared += v.compared;
      cur.matched += v.matched;
      bag.set(module, cur);
    }
  }
  const modules: ModuleScore[] = [...bag.entries()]
    .map(([module, v]) => ({ module, compared: v.compared, matched: v.matched, pct: v.compared ? Math.round((10000 * v.matched) / v.compared) / 100 : 100 }))
    .sort((a, b) => a.module.localeCompare(b.module));
  const linesCompared = perCase.reduce((a, c) => a + c.compared, 0);
  const linesMatched = perCase.reduce((a, c) => a + c.matched, 0);
  const casePass = perCase.filter((c) => c.pass).length;
  return {
    generatedAt: new Date().toISOString(),
    oracle: 'separately written Form 1040 instruction walk (src/oracle; does not import engine code). Same author as the engine — not an independent assessment. PolicyEngine-US / Tax-Calculator not used — see src/oracle/README.md.',
    cases: cases.length,
    casePass,
    caseFail: cases.length - casePass,
    linesCompared,
    linesMatched,
    overallPct: linesCompared ? Math.round((10000 * linesMatched) / linesCompared) / 100 : 100,
    modules,
    perCase,
  };
}

export function renderScorecardMd(s: Scorecard): string {
  const fails = s.perCase.filter((c) => !c.pass);
  const lines = [
    '# Ledgerline 2025 accuracy scorecard',
    '',
    `Generated ${s.generatedAt}`,
    '',
    `Oracle: ${s.oracle}`,
    '',
    'Compared lines are the intersection of keys both implementations computed. The oracle is a simpler instruction walk and does not always fill worksheet scratch lines (Schedule 1-A MAGI worksheets, unused Form 1040 zeros, etc.).',
    '',
    '## Overall',
    '',
    `| Cases | Pass | Fail | Lines compared | Lines matched | Accuracy |`,
    `| --- | ---: | ---: | ---: | ---: | ---: |`,
    `| ${s.cases} | ${s.casePass} | ${s.caseFail} | ${s.linesCompared} | ${s.linesMatched} | **${s.overallPct}%** |`,
    '',
    '## Per module',
    '',
    `| Module | Compared | Matched | Accuracy |`,
    `| --- | ---: | ---: | ---: | ---: |`,
    ...s.modules.map((m) => `| ${m.module} | ${m.compared} | ${m.matched} | ${m.pct}% |`),
    '',
    '## Failed cases',
    '',
  ];
  if (!fails.length) {
    lines.push('None. Engine and oracle agreed on every compared line.');
  } else {
    for (const c of fails) {
      lines.push(`### ${c.id} (${c.category})`);
      lines.push('');
      lines.push(`Matched ${c.matched} / ${c.compared}.`);
      lines.push('');
      lines.push('| Module | Line | Engine | Oracle |');
      lines.push('| --- | --- | ---: | ---: |');
      for (const m of c.mismatches.slice(0, 40)) {
        lines.push(`| ${m.module} | ${m.line} | ${m.engine} | ${m.oracle} |`);
      }
      lines.push('');
    }
  }
  lines.push('## Determinism');
  lines.push('');
  lines.push('Money amounts are IRS whole dollars (integers). The Tax Computation Worksheet rounds to cents, then to dollars. See rule `round-whole-dollar`. Running a case twice, or with shuffled W-2 / 1099 / business order, must produce byte-identical integer line maps (`tests/engine/determinism.test.ts`).');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

export function writeScorecard(dir = join(process.cwd(), 'test-data')): Scorecard {
  const s = buildScorecard();
  const slim = { ...s, perCase: s.perCase.map(({ moduleCounts: _m, ...rest }) => rest) };
  writeFileSync(join(dir, 'scorecard.json'), JSON.stringify(slim, null, 2));
  writeFileSync(join(dir, 'SCORECARD.md'), renderScorecardMd(s));
  return s;
}
