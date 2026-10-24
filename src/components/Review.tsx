// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import type { Lines, TaxResult, TaxReturnInput, TraceStep } from '@/engine';
import { formKey } from '@/engine/rules';
import { fmt } from '@/lib/storage';
import {
  F1040_LINES, F2210_LINES, F4952_LINES, F6251_LINES, F8995_LINES, F8995A_LINES, QDCG_LINES,
  S1A_LINES, SCH_8812_LINES, SCH_A_LINES, SCH_B_LINES, SCH_C_LINES, SCH_D_LINES, SCH_SE_LINES, STATUS_LABEL,
} from '@/lib/labels';

function WhyLinks({ form, line, trace }: { form: string; line: string; trace: TraceStep[] }) {
  const code = formKey(form);
  const ids = [...new Set(trace.filter((s) => s.form === code && s.line === line).flatMap((s) => s.ruleIds))];
  if (!ids.length) return null;
  return (
    <span className="why">
      {ids.map((id) => (
        <a key={id} href={`/rules#${id}`} title={id} data-testid={`why-${form}-${line}-${id}`}>{id}</a>
      ))}
    </span>
  );
}

function LineTable({ title, form, lines, labels, trace, testId, showZero = false, note, counts = [] }: {
  title: string; form: string; lines: Lines; labels: [string, string][]; trace: TraceStep[];
  testId?: string; showZero?: boolean; note?: string; counts?: string[];
}) {
  const rows = labels.filter(([k]) => k in lines && (showZero || lines[k] !== 0));
  return (
    <section className="form-card" data-testid={testId}>
      <h3>{title}</h3>
      {note && <p className="muted small">{note}</p>}
      {rows.length === 0 ? (
        <p className="muted small">Nothing to report.</p>
      ) : (
        <table className="lines">
          <tbody>
            {rows.map(([k, label]) => (
              <tr key={k} data-line={k}>
                <td className="ln">{k}</td>
                <td>{label} <WhyLinks form={form} line={k} trace={trace} /></td>
                <td className="amt">{counts.includes(k) ? lines[k] : fmt(lines[k])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function scopeTitle(r: TaxResult): string {
  if (r.scope.status === 'complete') {
    return r.refund > 0 ? `Refund ${fmt(r.refund)}` : r.amountOwed > 0 ? `Amount owed ${fmt(r.amountOwed)}` : 'Balanced: no refund, nothing owed';
  }
  if (r.scope.status === 'blocked') return 'Not a complete result — outside supported 2025 scope';
  if (r.scope.status === 'invalid') return 'Not a complete result — invalid amounts';
  return 'Not a complete result — required facts unanswered';
}

export function Review({ data, result }: { data: TaxReturnInput; result: TaxResult }) {
  const r = result;
  const F = r.form1040;
  const t = r.trace;
  const names = [data.taxpayer.firstName, data.filingStatus === 'mfj' ? data.spouse.firstName : ''].filter(Boolean).join(' & ');
  const complete = r.scope.status === 'complete';
  return (
    <div className="review">
      <div className={`review-hero ${complete ? '' : r.scope.status}`} data-testid="review-hero">
        <div>
          <p className="eyebrow">2025 federal return{names ? ` · ${names}` : ''}</p>
          <h2 data-testid="review-claim">{scopeTitle(r)}</h2>
          <p className="muted" data-testid="scope-status">
            Scope: {r.scope.status}
            {complete ? '' : ' — this is not a complete refund, tax, or owed claim.'}
          </p>
          {!complete && r.scope.previews.length > 0 && (
            <ul className="preview-list" data-testid="component-previews">
              {r.scope.previews.map((p) => (
                <li key={p.id}>{p.label}: {fmt(p.amount)} <span className="muted small">{p.note}</span></li>
              ))}
            </ul>
          )}
          {complete && (
          <p className="muted">
            {STATUS_LABEL[data.filingStatus]} · AGI {fmt(F['11b'])} · Taxable income {fmt(F['15'])} · Total tax {fmt(F['24'])} ·
            Effective rate {(r.effectiveRate * 100).toFixed(1)}% · Top bracket {(r.marginalRate * 100).toFixed(0)}%
          </p>
          )}
          <p className="muted small">
            Deduction: {r.usesItemized ? `itemized ${fmt(r.itemizedDeduction)}` : `standard ${fmt(r.standardDeduction)}`} (standard {fmt(r.standardDeduction)} vs.
            itemized {fmt(r.itemizedDeduction)}). Tax method: {r.taxMethod === 'table' ? 'Tax Table' : r.taxMethod === 'qdcg-worksheet' ? 'Qualified Dividends and Capital Gain Tax Worksheet' : 'Tax Computation Worksheet'}.
          </p>
        </div>
      </div>

      {r.warnings.length > 0 && (
        <section className="warnings" data-testid="warnings">
          <h3>Things to double-check</h3>
          <ul>
            {r.warnings.map((w, i) => (
              <li key={i} className={`w-${w.level}`}>
                <span className="tag">{w.level === 'unsupported' ? 'Not supported' : w.level === 'warn' ? 'Check' : 'Note'}</span> {w.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="forms-grid">
        <LineTable title="Form 1040" form="1040" trace={t} lines={F} labels={F1040_LINES} testId="f1040" showZero />
        <div className="stack">
          <LineTable title="Schedule 1 — Additional income and adjustments" form="1" trace={t} lines={r.schedule1} labels={[['3', 'Business income or (loss)'], ['10', 'Additional income'], ['15', 'Deductible part of SE tax'], ['16', 'SEP / solo 401(k)'], ['17', 'Self-employed health insurance'], ['26', 'Adjustments to income']]} testId="sch1" />
          <LineTable title="Schedule 2 — Additional taxes" form="2" trace={t} lines={r.schedule2} labels={[['2', 'Alternative minimum tax (Form 6251)'], ['4', 'Self-employment tax'], ['11', 'Additional Medicare Tax (Form 8959)'], ['12', 'Net investment income tax (Form 8960)'], ['21', 'Total other taxes']]} testId="sch2" />
          {F['13b'] > 0 && <LineTable title="Schedule 1-A — Additional deductions" form="1-A" trace={t} lines={r.schedule1A} labels={S1A_LINES} testId="sch1a" />}
          {r.qdcgWorksheet && <LineTable title="Qualified Dividends and Capital Gain Tax Worksheet" form="1040" trace={t} lines={r.qdcgWorksheet} labels={QDCG_LINES} testId="qdcg" showZero />}
        </div>
      </div>

      <div className="forms-grid">
        <LineTable title={`Schedule A — Itemized deductions${r.usesItemized ? ' (used)' : ' (not used: standard is larger)'}`} form="A" trace={t} lines={r.scheduleA} labels={SCH_A_LINES} testId="schA" />
        <LineTable title="Schedule B — Interest and ordinary dividends" form="B" trace={t} lines={r.scheduleB} labels={SCH_B_LINES} testId="schB"
          note={`Part III: foreign account ${data.foreignAccount ? 'Yes' : 'No'}; foreign trust ${data.foreignTrust ? 'Yes' : 'No'}.`} />
      </div>
      {(data.interest.length > 0 || data.dividends.length > 0) && (
        <section className="form-card">
          <h3>Schedule B payers</h3>
          <table className="lines">
            <tbody>
              {data.interest.filter((i) => i.taxable > 0).map((i) => (<tr key={i.id}><td className="ln">1</td><td>{i.payer || 'Interest payer'}</td><td className="amt">{fmt(i.taxable)}</td></tr>))}
              {data.dividends.filter((d) => d.ordinary > 0).map((d) => (<tr key={d.id}><td className="ln">5</td><td>{d.payer || 'Dividend payer'}</td><td className="amt">{fmt(d.ordinary)}</td></tr>))}
            </tbody>
          </table>
        </section>
      )}

      {r.scheduleC.map((c) => (
        <div className="forms-grid" key={c.id}>
          <LineTable title={`Schedule C — ${c.name || 'Business'} (${c.owner === 'spouse' ? 'spouse' : 'you'})`} form="C" trace={t} lines={c.lines} labels={SCH_C_LINES} testId="schC" />
          {r.scheduleSE.filter((s) => s.owner === c.owner).slice(0, 1).map((s) => (
            <LineTable key={s.owner} title={`Schedule SE — ${s.owner === 'spouse' ? 'spouse' : 'you'}`} form="SE" trace={t} lines={s.lines} labels={SCH_SE_LINES} testId="schSE" />
          ))}
        </div>
      ))}

      <div className="forms-grid">
        <LineTable title="Schedule 8812 — Child tax credit / other dependents" form="8812" trace={t} lines={r.schedule8812} labels={SCH_8812_LINES} testId="sch8812" counts={['4', '6']} />
        {r.scheduleC.length > 0 && !r.form8995A && <LineTable title="Form 8995 — QBI deduction (simplified)" form="8995" trace={t} lines={r.form8995} labels={F8995_LINES} testId="f8995" />}
        {r.form8995A && <LineTable title="Form 8995-A — QBI deduction" form="8995-A" trace={t} lines={r.form8995A} labels={F8995A_LINES} testId="f8995a" />}
      </div>
      {(r.form8949.length > 0 || (r.scheduleD['16'] ?? 0) !== 0) && (
        <div className="forms-grid">
          <LineTable title="Schedule D — Capital gains and losses" form="D" trace={t} lines={r.scheduleD} labels={SCH_D_LINES} testId="schD" />
          {r.form8949.length > 0 && (
            <section className="form-card" data-testid="f8949">
              <h3>Form 8949 — Sales</h3>
              <table className="lines">
                <tbody>
                  {r.form8949.map((t) => (
                    <tr key={t.id}>
                      <td className="ln">{t.term === 'long' ? 'LT' : 'ST'}</td>
                      <td>{t.description || 'Capital asset'}{t.collectible ? ' (collectible)' : ''}{t.unrecaptured1250 ? ' (§1250)' : ''}</td>
                      <td className="amt">{fmt(t.gain)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      )}
      {r.form6251['11'] > 0 && <LineTable title="Form 6251 — Alternative minimum tax" form="6251" trace={t} lines={r.form6251} labels={F6251_LINES} testId="f6251" />}
      {(r.form4952['3'] ?? 0) > 0 && <LineTable title="Form 4952 — Investment interest" form="4952" trace={t} lines={r.form4952} labels={F4952_LINES} testId="f4952" />}
      {(r.form2210['19'] ?? 0) > 0 && <LineTable title="Form 2210 — Estimated tax penalty" form="2210" trace={t} lines={r.form2210} labels={F2210_LINES} testId="f2210" />}
      {(r.form8959['18'] > 0 || r.form8959['24'] > 0 || r.form8960['17'] > 0) && (
        <div className="forms-grid">
          <LineTable title="Form 8959 — Additional Medicare Tax" form="8959" trace={t} lines={r.form8959} labels={[['1', 'Medicare wages'], ['5', 'Threshold'], ['7', 'Tax on wages'], ['8', 'SE income'], ['13', 'Tax on SE income'], ['18', 'Total'], ['22', 'Withheld (to line 25c)']]} />
          <LineTable title="Form 8960 — Net investment income tax" form="8960" trace={t} lines={r.form8960} labels={[['8', 'Investment income'], ['13', 'MAGI'], ['14', 'Threshold'], ['16', 'Taxable NII'], ['17', 'NIIT (3.8%)']]} />
        </div>
      )}
    </div>
  );
}
