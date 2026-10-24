// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useMemo, useState } from 'react';
import { FORMS, RULES, flaggedRules, type Rule, type RuleClass, type VerifiedFlag } from '@/engine/rules';

function matches(r: Rule, q: string): boolean {
  if (!q) return true;
  const hay = [
    r.id, r.topic, r.form, r.formLine, r.rule, r.reason, r.value2025, r.simplification,
    r.sourceUrl, r.indexing, r.sunset, r.unverifiedNote, r.parameterKey,
    ...r.citations.map((c) => c.ref), ...r.appliesTo,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function verifiedLabel(v: VerifiedFlag | undefined): string | null {
  if (v === false) return 'UNVERIFIED';
  if (v === 'partial') return 'partial';
  return null;
}

export function RulesWhy({ highlightId }: { highlightId?: string }) {
  const [q, setQ] = useState('');
  const [klass, setKlass] = useState<'all' | RuleClass>('all');
  const [form, setForm] = useState('all');
  const [onlySimp, setOnlySimp] = useState(false);
  const [onlyFlagged, setOnlyFlagged] = useState(false);

  const flags = useMemo(() => flaggedRules(RULES), []);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return RULES.filter((r) => {
      if (klass !== 'all' && r.classification !== klass) return false;
      if (form !== 'all' && r.form !== form) return false;
      if (onlySimp && !r.simplification) return false;
      if (onlyFlagged && r.verified !== false && r.verified !== 'partial') return false;
      return matches(r, needle);
    });
  }, [q, klass, form, onlySimp, onlyFlagged]);

  return (
    <div className="rules-page" data-testid="rules-page">
      <p className="eyebrow">Tax year 2025 · Ledgerline engine</p>
      <h1>Rules &amp; Why</h1>
      <p className="lead">
        Every number and decision the engine makes is listed here with the IRS authority behind it.
        <b> Stable</b> rules are year-over-year logic. <b> Annual</b> rules are 2025 parameters from
        {' '}<code>ty2025-parameters.json</code> (source URL, indexing, sunset).
      </p>

      {flags.length > 0 && (
        <aside className="verify-banner" data-testid="rules-unverified-banner">
          <p>
            <b>{flags.filter((r) => r.verified === false).length} UNVERIFIED</b>
            {' '}and{' '}
            <b>{flags.filter((r) => r.verified === 'partial').length} partial</b>
            {' '}rules need a source check this pass.
          </p>
          <p className="muted small">{flags.length} flagged rules are listed below and stay visible — they are not hidden.</p>
        </aside>
      )}

      <div className="rules-filters" data-testid="rules-filters">
        <label className="field">
          <span className="field-label">Search</span>
          <input className="text-input" data-testid="rules-search" placeholder="SALT, § 199A, Schedule 1-A…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Classification</span>
          <select className="text-input" data-testid="rules-class" value={klass} onChange={(e) => setKlass(e.target.value as typeof klass)}>
            <option value="all">All</option>
            <option value="stable">Stable (logic)</option>
            <option value="annual">Annual (2025 figures)</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Form</span>
          <select className="text-input" data-testid="rules-form" value={form} onChange={(e) => setForm(e.target.value)}>
            <option value="all">All forms</option>
            {FORMS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="check" style={{ alignSelf: 'end', marginBottom: '0.9rem' }}>
          <input type="checkbox" data-testid="rules-simp" checked={onlySimp} onChange={(e) => setOnlySimp(e.target.checked)} />
          <span>Simplifications only</span>
        </label>
        {flags.length > 0 && (
          <label className="check" style={{ alignSelf: 'end', marginBottom: '0.9rem' }}>
            <input type="checkbox" data-testid="rules-unverified" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} />
            <span>Unverified / partial</span>
          </label>
        )}
      </div>
      <p className="muted small" data-testid="rules-count">{rows.length} of {RULES.length} rules</p>

      <div className="rules-list">
        {rows.map((r) => {
          const flag = verifiedLabel(r.verified);
          return (
            <article
              key={r.id}
              id={r.id}
              className={`rule-card ${highlightId === r.id ? 'on' : ''} ${r.verified === false ? 'unverified' : ''} ${r.verified === 'partial' ? 'partial' : ''}`}
              data-testid={`rule-${r.id}`}
              data-class={r.classification}
              data-verified={r.verified === false ? 'false' : r.verified === 'partial' ? 'partial' : 'true'}
            >
              <header>
                <span className={`tag ${r.classification}`}>{r.classification}</span>
                {flag && <span className={`tag ${r.verified === false ? 'unverified' : 'partial'}`}>{flag}</span>}
                <span className="rule-form">{r.form} · {r.formLine}</span>
                <h3>{r.topic}</h3>
              </header>
              <p className="rule-id">
                <code>{r.id}</code>
                {r.value2025 ? <> · 2025: {r.value2025}</> : null}
                {r.parameterKey ? <> · pack <code>{r.parameterKey}</code></> : null}
              </p>
              <p><b>Rule.</b> {r.rule}</p>
              <p><b>Why.</b> {r.reason}</p>
              {r.unverifiedNote && (r.verified === false || r.verified === 'partial') && (
                <p className="unverified-note" data-testid={`rule-${r.id}-flag`}><b>Verification.</b> {r.unverifiedNote}</p>
              )}
              {r.classification === 'annual' && (r.sourceUrl || r.indexing || r.sunset) && (
                <dl className="pack-meta">
                  {r.sourceUrl && (
                    <>
                      <dt>Source</dt>
                      <dd><a href={r.sourceUrl} target="_blank" rel="noreferrer">{r.sourceUrl}</a></dd>
                    </>
                  )}
                  {r.indexing && (
                    <>
                      <dt>Indexing</dt>
                      <dd>{r.indexing}</dd>
                    </>
                  )}
                  {r.sunset && (
                    <>
                      <dt>Sunset</dt>
                      <dd>{r.sunset}</dd>
                    </>
                  )}
                </dl>
              )}
              {r.simplification && <p className="simp"><b>Simplification.</b> {r.simplification}</p>}
              <ul className="cites">
                {r.citations.map((c) => (
                  <li key={c.ref}>
                    {c.url ? <a href={c.url} target="_blank" rel="noreferrer">{c.ref}</a> : c.ref}
                  </li>
                ))}
              </ul>
              <p className="muted small">Used on: {r.appliesTo.join(', ')}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
