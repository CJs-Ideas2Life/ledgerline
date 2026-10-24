// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ageFromDob, blankBusiness, blankDependent, blankDividend, blankInterest, blankReturn, blankTrade, blankW2, computeReturn, sampleReturn,
  type Business, type FilingStatus, type Person, type TaxReturnInput,
} from '@/engine';
import {
  activeInput, blankInterview, CLEAR_DATA_WARNING, clearAllLedgerlineData, exportStateJson, fmt, loadState, markCompleted, markVisited, sampleInterview, saveState, type Interview,
} from '@/lib/storage';
import { DISCLAIMER_PARAGRAPHS, hasAcknowledgedDisclaimer } from '@/lib/disclaimer';
import { STATUS_LABEL } from '@/lib/labels';
import { Age, Check, Choice, Money, Text, YesNo } from './fields';
import { DisclaimerGate } from './DisclaimerGate';
import { Review } from './Review';
import { SiteFooter } from './SiteFooter';

const STEPS = ['Start', 'About you', 'Family', 'Wages', 'Investments', 'Self-employment', 'Deductions', 'Payments', 'Review'] as const;

export default function App() {
  const [data, setData] = useState<TaxReturnInput>(blankReturn);
  const [iv, setIv] = useState<Interview>(blankInterview);
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState<string | null>(null);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [acknowledged, setAcknowledged] = useState<boolean | null>(null);

  useEffect(() => {
    const s = loadState();
    if (s.status === 'ok') {
      setData(s.data);
      setIv(s.interview);
      setSavedAt(s.savedAt || null);
    } else if (s.status === 'invalid') {
      setLoadErrors(s.errors);
    }
    setAcknowledged(hasAcknowledgedDisclaimer());
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!(loaded && acknowledged)) return;
    const result = saveState(data, iv);
    if (result.status === 'persisted') {
      setSavedAt(result.savedAt);
      setSaveFailed(null);
    } else {
      setSaveFailed(result.error);
    }
  }, [data, iv, loaded, acknowledged]);

  const canCreateReturn = acknowledged === true;
  const startReturn = () => {
    if (!canCreateReturn) return;
    go(1, { complete: true });
  };
  const loadSample = () => {
    if (!canCreateReturn) return;
    setData(sampleReturn());
    setIv(sampleInterview());
  };

  const live = useMemo(() => activeInput(data, iv), [data, iv]);
  const result = useMemo(() => computeReturn(live), [live]);
  const up = (patch: Partial<TaxReturnInput>) => setData((d) => ({ ...d, ...patch }));
  const go = (step: number, opts?: { complete?: boolean }) => {
    setIv((v) => {
      const next = Math.max(0, Math.min(STEPS.length - 1, step));
      const moved = markVisited(opts?.complete ? markCompleted(v, v.step) : v, next);
      return { ...moved, step: next };
    });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  };
  const downloadBackup = () => {
    const blob = new Blob([exportStateJson(data, iv)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ledgerline-ty2025-return.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const step = iv.step;
  const joint = data.filingStatus === 'mfj';

  return (
    <div className="shell">
      {acknowledged === false && <DisclaimerGate onAccept={() => setAcknowledged(true)} />}
      <Meter
        refund={result.refund}
        owed={result.amountOwed}
        totalTax={result.form1040['24']}
        agi={result.form1040['11b']}
        savedAt={savedAt}
        saveFailed={saveFailed}
        scopeStatus={result.scope.status}
        previews={result.scope.previews}
      />
      <div className="layout">
        <nav className="steps" aria-label="Interview steps">
          <ol>
            {STEPS.map((s, i) => {
              const done = iv.completed.includes(i);
              const seen = iv.visited.includes(i);
              const cls = i === step ? 'step on' : done ? 'step done' : seen ? 'step visited' : 'step';
              return (
              <li key={s}>
                <button type="button" className={cls} onClick={() => { if (!canCreateReturn && i > 0) return; go(i); }} data-testid={`nav-${i}`}>
                  <span className="dot">{done ? '✓' : i + 1}</span>
                  {s}
                </button>
              </li>
              );
            })}
          </ol>
          <a className="print-link" href="/rules" data-testid="rules-link">Rules &amp; Why ↗</a>
          <a className="print-link" href="/print" data-testid="print-link">Print-friendly summary ↗</a>
        </nav>

        <main className="panel" data-testid={`step-${step}`}>
          {saveFailed && (
            <div className="unsaved-banner" data-testid="unsaved-banner" role="status">
              <p><strong>Unsaved.</strong> The last durable save did not complete. Your current work is still in memory.</p>
              <p className="muted small">{saveFailed}</p>
              <button type="button" className="btn" data-testid="export-backup" onClick={downloadBackup}>Download a recovery copy</button>
              <p className="muted small" data-testid="export-privacy">This file contains your tax information; store it somewhere private.</p>
            </div>
          )}
          {loadErrors.length > 0 && (
            <div className="load-errors" data-testid="load-errors">
              <p><strong>Saved work was not loaded.</strong> Ledgerline did not relabel or replace it.</p>
              <ul>{loadErrors.map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
          )}
          {step === 0 && (
            <section className="welcome">
              <p className="eyebrow">Tax year 2025 · Federal · Form 1040</p>
              <h1>Let&rsquo;s do your 2025 taxes, one question at a time.</h1>
              <p className="lead">
                We&rsquo;ll ask plain-language questions about your household, wages, investments, side business and deductions. Your
                estimate updates live in the bar above. Everything stays in this browser: there are no accounts and nothing is sent anywhere.
              </p>
              <div className="about-notice" data-testid="about-disclaimer">
                {DISCLAIMER_PARAGRAPHS.map((p) => (
                  <p key={p}>{p}</p>
                ))}
                <p>
                  Read the full <a href="/disclaimer">Disclaimer</a> before you rely on any figure.
                </p>
              </div>
              <div className="actions">
                <button className="btn primary" data-testid="start" disabled={!canCreateReturn} onClick={startReturn}>{savedAt && data.taxpayer.firstName ? 'Continue my return' : 'Start my return'}</button>
                <button className="btn" data-testid="load-sample" disabled={!canCreateReturn} onClick={loadSample}>Load a sample return</button>
                <button
                  className="btn ghost"
                  data-testid="clear-data"
                  onClick={() => {
                    if (!confirm(CLEAR_DATA_WARNING)) return;
                    clearAllLedgerlineData();
                    setData(blankReturn());
                    setIv(blankInterview());
                    setSavedAt(null);
                    setSaveFailed(null);
                    setLoadErrors([]);
                    setAcknowledged(false);
                  }}
                >
                  Clear data in this browser
                </button>
              </div>
              <ul className="covers">
                <li>W-2 wages and withholding</li>
                <li>Interest and dividends (Schedule B)</li>
                <li>Self-employment (Schedule C + SE tax)</li>
                <li>Itemized vs. standard deduction (Schedule A, 2025 SALT cap)</li>
                <li>Child tax credit and credit for other dependents</li>
                <li>Qualified business income deduction (Form 8995 / 8995-A)</li>
                <li>Schedule D / Form 8949, AMT, EIC, and 2025 Schedule 1-A deductions</li>
              </ul>
              <p className="muted small">Do not enter Social Security numbers — they are not needed for the estimate.</p>
              <p className="muted small" data-testid="storage-warning">
                Drafts are stored as <strong>plain text</strong> in this browser only. Ledgerline does not create an
                account and does not send return data to a server. Anyone who can use this browser profile can read the
                draft. Use <strong>Clear data in this browser</strong> when you are done, especially on a shared computer.
              </p>
            </section>
          )}

          {step === 1 && (
            <section>
              <h2>First, tell us about you</h2>
              <div className="grid2">
                <Text label="Your first name" value={data.taxpayer.firstName} onChange={(v) => up({ taxpayer: { ...data.taxpayer, firstName: v } })} testId="tp-first" />
                <Text label="Your last name" value={data.taxpayer.lastName} onChange={(v) => up({ taxpayer: { ...data.taxpayer, lastName: v } })} testId="tp-last" />
              </div>
              <Choice<FilingStatus>
                label="What was your filing status on December 31, 2025?"
                value={data.filingStatus}
                onChange={(v) => up({ filingStatus: v })}
                testId="filing-status"
                options={[
                  { value: 'single', label: STATUS_LABEL.single, hint: 'Unmarried, no qualifying person' },
                  { value: 'mfj', label: STATUS_LABEL.mfj, hint: 'One return for both spouses' },
                  { value: 'mfs', label: STATUS_LABEL.mfs, hint: 'Each spouse files their own' },
                  { value: 'hoh', label: STATUS_LABEL.hoh, hint: 'Unmarried and paid over half the cost of a home for a qualifying person' },
                  { value: 'qss', label: STATUS_LABEL.qss, hint: 'Spouse died in 2023 or 2024 and you have a dependent child' },
                ]}
              />
              <PersonFacts person={data.taxpayer} prefix="tp" onChange={(p) => up({ taxpayer: p })} />
              <YesNo question="Does someone else have the right to claim you as a dependent?" value={data.canBeClaimedAsDependent} onChange={(b) => up({ canBeClaimedAsDependent: b })} testId="tp-dependent" />
              {data.filingStatus === 'mfs' && (
                <>
                  <YesNo question="Does your spouse itemize deductions on their separate return?" value={data.spouseItemizes} onChange={(b) => up({ spouseItemizes: b })} testId="mfs-itemizes" help="If yes, you must itemize too (your standard deduction is $0)." />
                  <YesNo question="Did you live apart from your spouse for the last 6 months of 2025?" value={data.mfsLivedApart} onChange={(b) => up({ mfsLivedApart: b })} testId="mfs-apart" help="Needed for the earned income credit if you file separately." />
                </>
              )}
              {joint && (
                <div className="sub">
                  <h3>Your spouse</h3>
                  <div className="grid2">
                    <Text label="Spouse's first name" value={data.spouse.firstName} onChange={(v) => up({ spouse: { ...data.spouse, firstName: v } })} testId="sp-first" />
                    <Text label="Spouse's last name" value={data.spouse.lastName} onChange={(v) => up({ spouse: { ...data.spouse, lastName: v } })} />
                  </div>
                  <PersonFacts person={data.spouse} prefix="sp" onChange={(p) => up({ spouse: p })} />
                </div>
              )}
              <Nav back={() => go(0)} next={() => go(2, { complete: true })} />
            </section>
          )}

          {step === 2 && (
            <section>
              <h2>Who else is on your return?</h2>
              <YesNo question="Can you claim any dependents for 2025?" value={iv.hasDependents} onChange={(b) => { setIv({ ...iv, hasDependents: b }); if (b && !data.dependents.length) up({ dependents: [blankDependent()] }); }} testId="has-deps" />
              {iv.hasDependents === false && data.dependents.length > 0 && (
                <p className="stale-note" data-testid="stale-deps">Previous dependent answers are hidden and not used. Say Yes to review them again.</p>
              )}
              {iv.hasDependents && (
                <>
                  {data.dependents.map((d, i) => {
                    const setD = (patch: Partial<typeof d>) => up({ dependents: data.dependents.map((x) => (x.id === d.id ? { ...x, ...patch } : x)) });
                    return (
                    <div className="item-card" key={d.id} data-testid={`dep-${i}`}>
                      <div className="grid2">
                        <Text label="First name" value={d.firstName} onChange={(v) => setD({ firstName: v })} testId={`dep-${i}-name`} />
                        <Text label="Relationship" value={d.relationship} onChange={(v) => setD({ relationship: v })} />
                      </div>
                      <div className="grid2">
                        <Text label="Date of birth" value={d.dateOfBirth} onChange={(v) => setD({ dateOfBirth: v, ageAtYearEnd: ageFromDob(v) ?? d.ageAtYearEnd })} placeholder="YYYY-MM-DD" testId={`dep-${i}-dob`} />
                        <Age label="Age on December 31, 2025" value={d.ageAtYearEnd} onChange={(n) => setD({ ageAtYearEnd: n })} testId={`dep-${i}-age`} />
                      </div>
                      <YesNo question="Under age 17 at the end of 2025?" value={d.under17} onChange={(b) => setD({ under17: b })} testId={`dep-${i}-under17`} />
                      <YesNo question="Qualifying child for the earned income credit?" value={d.eicQualifying} onChange={(b) => setD({ eicQualifying: b })} testId={`dep-${i}-eic`} help="Under 19, or under 24 and a student, or permanently and totally disabled." />
                      <YesNo question="Full-time student?" value={d.isStudent} onChange={(b) => setD({ isStudent: b })} testId={`dep-${i}-student`} />
                      <YesNo question="Permanently and totally disabled?" value={d.isPermanentlyDisabled} onChange={(b) => setD({ isPermanentlyDisabled: b })} testId={`dep-${i}-disabled`} />
                      <YesNo question="Lived with you for more than half of 2025?" value={d.livedWithTaxpayerMoreThanHalfYear} onChange={(b) => setD({ livedWithTaxpayerMoreThanHalfYear: b })} testId={`dep-${i}-residency`} />
                      <YesNo question="Has a Social Security number valid for employment issued before the return due date?" value={d.hasValidSSN} onChange={(b) => setD({ hasValidSSN: b })} testId={`dep-${i}-ssn`} />
                      <p className="muted small">Credits stay gated until age, residency, and SSN are answered. An explicit No is a completed answer.</p>
                      <button className="link danger" onClick={() => up({ dependents: data.dependents.filter((x) => x.id !== d.id) })}>Remove</button>
                    </div>
                    );
                  })}
                  <button className="btn" data-testid="add-dep" onClick={() => up({ dependents: [...data.dependents, blankDependent()] })}>+ Add another dependent</button>
                </>
              )}
              <Nav back={() => go(1)} next={() => go(3, { complete: true })} />
            </section>
          )}

          {step === 3 && (
            <section>
              <h2>Did you work for an employer?</h2>
              <YesNo question={joint ? 'Did you or your spouse get a W-2 for 2025?' : 'Did you get a W-2 for 2025?'} value={iv.hasW2} onChange={(b) => { setIv({ ...iv, hasW2: b }); if (b && !data.w2s.length) up({ w2s: [blankW2()] }); }} testId="has-w2" />
              {iv.hasW2 === false && data.w2s.length > 0 && <p className="stale-note">Previous W-2 answers are hidden and not used.</p>}
              {iv.hasW2 && (
                <>
                  {data.w2s.map((w, i) => {
                    const set = (patch: Partial<typeof w>) => up({ w2s: data.w2s.map((x) => (x.id === w.id ? { ...x, ...patch } : x)) });
                    return (
                      <div className="item-card" key={w.id} data-testid={`w2-${i}`}>
                        <div className="grid2">
                          <Text label="Employer name" value={w.employer} onChange={(v) => set({ employer: v })} testId={`w2-${i}-employer`} />
                          {joint && <OwnerPick value={w.owner} onChange={(o) => set({ owner: o })} />}
                        </div>
                        <div className="grid3">
                          <Money label="Box 1 · Wages" value={w.wages} onChange={(n) => set({ wages: n })} testId={`w2-${i}-box1`} />
                          <Money label="Box 2 · Federal tax withheld" value={w.federalWithholding} onChange={(n) => set({ federalWithholding: n })} testId={`w2-${i}-box2`} />
                          <Money label="Box 3 · Social security wages" value={w.socialSecurityWages} onChange={(n) => set({ socialSecurityWages: n })} testId={`w2-${i}-box3`} />
                          <Money label="Box 4 · Social security tax" value={w.socialSecurityTax} onChange={(n) => set({ socialSecurityTax: n })} testId={`w2-${i}-box4`} />
                          <Money label="Box 5 · Medicare wages" value={w.medicareWages} onChange={(n) => set({ medicareWages: n })} testId={`w2-${i}-box5`} />
                          <Money label="Box 6 · Medicare tax" value={w.medicareTax} onChange={(n) => set({ medicareTax: n })} testId={`w2-${i}-box6`} />
                          <Money label="Qualified tips (box 7 / Notice 2025-69)" value={w.qualifiedTips} onChange={(n) => set({ qualifiedTips: n })} testId={`w2-${i}-tips`} hint="Occupation must customarily receive tips. Deducted on Schedule 1-A, up to $25,000." />
                          <Money label="Qualified overtime (FLSA premium only)" value={w.qualifiedOvertime} onChange={(n) => set({ qualifiedOvertime: n })} testId={`w2-${i}-ot`} hint="Only the extra half-time pay, not the whole overtime check. Cap $12,500 ($25,000 joint)." />
                        </div>
                        <button className="link danger" onClick={() => up({ w2s: data.w2s.filter((x) => x.id !== w.id) })}>Remove this W-2</button>
                      </div>
                    );
                  })}
                  <button className="btn" onClick={() => up({ w2s: [...data.w2s, blankW2()] })}>+ Add another W-2</button>
                </>
              )}
              <Nav back={() => go(2)} next={() => go(4, { complete: true })} />
            </section>
          )}

          {step === 4 && (
            <section>
              <h2>Interest and dividends</h2>
              <YesNo question="Did you receive any 1099-INT, 1099-DIV, or 1099-B forms?" value={iv.hasInvestments} onChange={(b) => { setIv({ ...iv, hasInvestments: b }); if (b && !data.interest.length && !data.dividends.length && !data.capitalGains.length) up({ interest: [blankInterest()], dividends: [] }); }} testId="has-inv" />
              {iv.hasInvestments === false && (data.interest.length + data.dividends.length + data.capitalGains.length) > 0 && (
                <p className="stale-note">Previous investment answers are hidden and not used.</p>
              )}
              {iv.hasInvestments && (
                <>
                  <h3>Interest (1099-INT)</h3>
                  {data.interest.map((it, i) => {
                    const set = (p: Partial<typeof it>) => up({ interest: data.interest.map((x) => (x.id === it.id ? { ...x, ...p } : x)) });
                    return (
                      <div className="item-card" key={it.id} data-testid={`int-${i}`}>
                        <div className="grid2"><Text label="Payer" value={it.payer} onChange={(v) => set({ payer: v })} testId={`int-${i}-payer`} /></div>
                        <div className="grid3">
                          <Money label="Taxable interest (boxes 1 + 3)" value={it.taxable} onChange={(n) => set({ taxable: n })} testId={`int-${i}-taxable`} />
                          <Money label="Tax-exempt interest (box 8)" value={it.taxExempt} onChange={(n) => set({ taxExempt: n })} testId={`int-${i}-exempt`} />
                          <Money label="Federal tax withheld (box 4)" value={it.federalWithholding} onChange={(n) => set({ federalWithholding: n })} />
                        </div>
                        <button className="link danger" onClick={() => up({ interest: data.interest.filter((x) => x.id !== it.id) })}>Remove</button>
                      </div>
                    );
                  })}
                  <button className="btn" data-testid="add-int" onClick={() => up({ interest: [...data.interest, blankInterest()] })}>+ Add interest</button>
                  <h3>Dividends (1099-DIV)</h3>
                  {data.dividends.map((d, i) => {
                    const set = (p: Partial<typeof d>) => up({ dividends: data.dividends.map((x) => (x.id === d.id ? { ...x, ...p } : x)) });
                    return (
                      <div className="item-card" key={d.id} data-testid={`div-${i}`}>
                        <div className="grid2"><Text label="Payer" value={d.payer} onChange={(v) => set({ payer: v })} testId={`div-${i}-payer`} /></div>
                        <div className="grid3">
                          <Money label="Ordinary dividends (box 1a)" value={d.ordinary} onChange={(n) => set({ ordinary: n })} testId={`div-${i}-ordinary`} />
                          <Money label="Qualified dividends (box 1b)" value={d.qualified} onChange={(n) => set({ qualified: n })} testId={`div-${i}-qualified`} />
                          <Money label="Capital gain distributions (box 2a)" value={d.capitalGainDistributions} onChange={(n) => set({ capitalGainDistributions: n })} testId={`div-${i}-capgain`} />
                          <Money label="Federal tax withheld (box 4)" value={d.federalWithholding} onChange={(n) => set({ federalWithholding: n })} />
                        </div>
                        <button className="link danger" onClick={() => up({ dividends: data.dividends.filter((x) => x.id !== d.id) })}>Remove</button>
                      </div>
                    );
                  })}
                  <button className="btn" data-testid="add-div" onClick={() => up({ dividends: [...data.dividends, blankDividend()] })}>+ Add dividends</button>
                  <div className="sub">
                    <h3>Foreign accounts (Schedule B, Part III)</h3>
                    <Check label="I had a financial interest in or signature authority over a foreign financial account" checked={data.foreignAccount} onChange={(b) => up({ foreignAccount: b })} />
                    <Check label="I received a distribution from, or was a grantor of or transferor to, a foreign trust" checked={data.foreignTrust} onChange={(b) => up({ foreignTrust: b })} />
                  </div>
                  <h3>Capital asset sales (Form 8949 / Schedule D)</h3>
                  <p className="muted small">Broker 1099-B sales. Collectibles and unrecaptured §1250 gain are included in the net but not taxed at the 28%/25% special rates.</p>
                  {data.capitalGains.map((t, i) => {
                    const set = (p: Partial<typeof t>) => up({ capitalGains: data.capitalGains.map((x) => (x.id === t.id ? { ...x, ...p } : x)) });
                    return (
                      <div className="item-card" key={t.id} data-testid={`cg-${i}`}>
                        <div className="grid2">
                          <Text label="Description" value={t.description} onChange={(v) => set({ description: v })} testId={`cg-${i}-desc`} />
                          <label className="field">
                            <span className="field-label">Holding period</span>
                            <select className="text-input" value={t.term} onChange={(e) => set({ term: e.target.value as typeof t.term })}>
                              <option value="auto">From the dates</option>
                              <option value="short">Short-term (1 year or less)</option>
                              <option value="long">Long-term (more than 1 year)</option>
                            </select>
                          </label>
                        </div>
                        <div className="grid3">
                          <Text label="Date acquired" value={t.dateAcquired} onChange={(v) => set({ dateAcquired: v })} placeholder="YYYY-MM-DD" />
                          <Text label="Date sold" value={t.dateSold} onChange={(v) => set({ dateSold: v })} placeholder="YYYY-MM-DD" />
                          <Money label="Proceeds" value={t.proceeds} onChange={(n) => set({ proceeds: n })} testId={`cg-${i}-proceeds`} />
                          <Money label="Cost or other basis" value={t.cost} onChange={(n) => set({ cost: n })} testId={`cg-${i}-cost`} />
                        </div>
                        <Check label="Collectible (art, coins, precious metals)" checked={t.collectible} onChange={(b) => set({ collectible: b })} />
                        <Check label="Unrecaptured section 1250 gain (real estate depreciation)" checked={t.unrecaptured1250} onChange={(b) => set({ unrecaptured1250: b })} />
                        <button className="link danger" onClick={() => up({ capitalGains: data.capitalGains.filter((x) => x.id !== t.id) })}>Remove</button>
                      </div>
                    );
                  })}
                  <button className="btn" data-testid="add-cg" onClick={() => up({ capitalGains: [...data.capitalGains, blankTrade()] })}>+ Add a sale</button>
                  <div className="grid2">
                    <Money label="Short-term capital loss carryover from 2024" value={data.stLossCarryover} onChange={(n) => up({ stLossCarryover: n })} />
                    <Money label="Long-term capital loss carryover from 2024" value={data.ltLossCarryover} onChange={(n) => up({ ltLossCarryover: n })} />
                  </div>
                </>
              )}
              <Nav back={() => go(3)} next={() => go(5, { complete: true })} />
            </section>
          )}

          {step === 5 && (
            <section>
              <h2>Self-employment and side businesses</h2>
              <YesNo question={joint ? 'Did you or your spouse run a business, freelance, or do gig work?' : 'Did you run a business, freelance, or do gig work?'} value={iv.hasBusiness} onChange={(b) => { setIv({ ...iv, hasBusiness: b }); if (b && !data.businesses.length) up({ businesses: [blankBusiness()] }); }} testId="has-biz" help="Sole proprietorships and single-member LLCs report on Schedule C." />
              {iv.hasBusiness === false && data.businesses.length > 0 && <p className="stale-note">Previous business answers are hidden and not used.</p>}
              {iv.hasBusiness && (
                <>
                  {data.businesses.map((b, i) => (
                    <BusinessCard key={b.id} b={b} i={i} joint={joint} profit={result.scheduleC.find((c) => c.id === b.id)?.lines['31'] ?? 0}
                      onChange={(nb) => up({ businesses: data.businesses.map((x) => (x.id === b.id ? nb : x)) })}
                      onRemove={() => up({ businesses: data.businesses.filter((x) => x.id !== b.id) })} />
                  ))}
                  <button className="btn" onClick={() => up({ businesses: [...data.businesses, blankBusiness()] })}>+ Add another business</button>
                  <div className="sub">
                    <Money label="Prior-year qualified business loss carryforward (Form 8995 line 3)" value={data.qbiLossCarryforward} onChange={(n) => up({ qbiLossCarryforward: n })} />
                    <Check label="I (or my spouse) could have enrolled in an employer health plan" checked={data.coveredByEmployerHealthPlan} onChange={(b) => up({ coveredByEmployerHealthPlan: b })} hint="If so, the self-employed health insurance deduction is not allowed." />
                  </div>
                </>
              )}
              <Nav back={() => go(4)} next={() => go(6, { complete: true })} />
            </section>
          )}

          {step === 6 && (
            <section>
              <h2>Deductions: itemize or take the standard?</h2>
              <p className="lead">Enter what you paid in 2025. We&rsquo;ll compare it with your {fmt(result.standardDeduction)} standard deduction and use whichever is larger.</p>
              <DeductionCompare std={result.standardDeduction} item={result.itemizedDeduction} uses={result.usesItemized} />
              <ItemizedForm data={data} up={up} salt={result.scheduleA['5e']} saltTotal={result.scheduleA['5d']} medFloor={result.scheduleA['3']} />
              <Check label="Itemize even if it's less than the standard deduction" checked={data.forceItemize} onChange={(b) => up({ forceItemize: b })} />
              <Nav back={() => go(5)} next={() => go(7, { complete: true })} />
            </section>
          )}

          {step === 7 && (
            <section>
              <h2>Payments you already made</h2>
              <p className="lead">Withholding from your W-2s and 1099s is already counted ({fmt(result.form1040['25d'])}).</p>
              <div className="grid2">
                <Money label="2025 estimated tax payments (incl. 2024 overpayment applied)" value={data.estimatedPayments} onChange={(n) => up({ estimatedPayments: n })} testId="estimated" />
                <Money label="2024 total tax (Form 2210 line 8)" value={data.priorYearTax} onChange={(n) => up({ priorYearTax: n })} hint="Enter last year’s tax to compute the estimated-tax penalty (equal-installment regular method)." testId="prior-tax" />
                <Money label="2024 adjusted gross income" value={data.priorYearAgi} onChange={(n) => up({ priorYearAgi: n })} hint="Used only to choose the 100% vs 110% prior-year safe harbor." />
              </div>
              <Nav back={() => go(6)} next={() => go(8, { complete: true })} nextLabel="Review my return" />
            </section>
          )}

          {step === 8 && (
            <section>
              <div className="review-actions">
                <h2>Review</h2>
                <a className="btn primary" href="/print" data-testid="print-summary">Print-friendly summary</a>
              </div>
              <Review data={live} result={result} />
              <Nav back={() => go(7)} />
            </section>
          )}
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}

function Meter({
  refund, owed, totalTax, agi, savedAt, saveFailed, scopeStatus, previews,
}: {
  refund: number; owed: number; totalTax: number; agi: number; savedAt: string | null;
  saveFailed: string | null;
  scopeStatus: 'complete' | 'incomplete' | 'blocked' | 'invalid';
  previews: { id: string; label: string; amount: number }[];
}) {
  const complete = scopeStatus === 'complete';
  const value = complete ? (refund > 0 ? refund : -owed) : 0;
  const prev = useRef(value);
  const [delta, setDelta] = useState(0);
  useEffect(() => {
    const d = value - prev.current;
    prev.current = value;
    if (d !== 0) {
      setDelta(d);
      const t = setTimeout(() => setDelta(0), 1800);
      return () => clearTimeout(t);
    }
  }, [value]);
  const label = complete
    ? (refund > 0 ? 'Estimated federal refund' : owed > 0 ? 'Estimated amount owed' : 'Federal balance')
    : scopeStatus === 'blocked'
      ? 'Not a complete result'
      : scopeStatus === 'invalid'
        ? 'Invalid amounts'
        : 'Incomplete — preview only';
  const amount = complete ? fmt(refund > 0 ? refund : owed) : (previews[0] ? fmt(previews[0].amount) : '—');
  return (
    <header className="meter" data-testid="meter">
      <div className="brand">
        <span className="logo" aria-hidden>
          <svg viewBox="0 0 32 32" width="28" height="28"><rect x="3" y="5" width="26" height="22" rx="6" fill="currentColor" opacity=".18" /><path d="M9 21 L14 15 L18 18 L24 10" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <span>Ledgerline <small>2025</small></span>
      </div>
      <div className={`meter-value ${complete && refund > 0 ? 'pos' : complete && owed > 0 ? 'neg' : ''}`}>
        <span className="meter-label">{label}</span>
        <strong data-testid="meter-amount">{amount}</strong>
        {complete && delta !== 0 && <span className={`delta ${delta > 0 ? 'up' : 'down'}`}>{delta > 0 ? '▲' : '▼'} {fmt(Math.abs(delta))}</span>}
      </div>
      <div className="meter-side">
        <span data-testid="meter-scope">Scope {scopeStatus}</span>
        <span>AGI {fmt(agi)}</span>
        <span>Total tax {fmt(totalTax)}</span>
        <span className={`saved${saveFailed ? ' warn' : ''}`} data-testid="save-indicator">
          {saveFailed ? 'Unsaved — last write failed' : savedAt ? 'Saved in this browser' : 'Not saved yet'}
        </span>
      </div>
    </header>
  );
}

function PersonFacts({ person, prefix, onChange }: { person: Person; prefix: string; onChange: (p: Person) => void }) {
  return (
    <div className="sub">
      <div className="grid2">
        <Text label="Date of birth" value={person.dateOfBirth} onChange={(v) => onChange({ ...person, dateOfBirth: v, ageAtYearEnd: ageFromDob(v) ?? person.ageAtYearEnd })} placeholder="YYYY-MM-DD" testId={`${prefix}-dob`} />
        <Age label="Age on December 31, 2025" value={person.ageAtYearEnd} onChange={(n) => onChange({ ...person, ageAtYearEnd: n })} testId={`${prefix}-age`} hint="Leave blank if unanswered. Age 0 is a valid newborn." />
      </div>
      <YesNo question="Born before January 2, 1961 (age 65 or older at year-end 2025)?" value={person.bornBefore1961} onChange={(b) => onChange({ ...person, bornBefore1961: b })} testId={`${prefix}-65`} />
      <YesNo question="Age 50 or older on December 31, 2025?" value={person.age50OrOver} onChange={(b) => onChange({ ...person, age50OrOver: b })} testId={`${prefix}-50`} help="Unlocks the $7,500 solo 401(k) catch-up." />
      <YesNo question="Blind?" value={person.blind} onChange={(b) => onChange({ ...person, blind: b })} testId={`${prefix}-blind`} />
      <YesNo question="Social Security number valid for employment?" value={person.hasValidSSN} onChange={(b) => onChange({ ...person, hasValidSSN: b })} testId={`${prefix}-ssn`} help="Needed for the child tax credit, EIC, and the senior / tip / overtime deductions." />
    </div>
  );
}

function Nav({ back, next, nextLabel = 'Continue' }: { back?: () => void; next?: () => void; nextLabel?: string }) {
  return (
    <div className="nav">
      {back ? <button className="btn ghost" onClick={back} data-testid="back">← Back</button> : <span />}
      {next && <button className="btn primary" onClick={next} data-testid="continue">{nextLabel} →</button>}
    </div>
  );
}

function OwnerPick({ value, onChange }: { value: 'taxpayer' | 'spouse'; onChange: (o: 'taxpayer' | 'spouse') => void }) {
  return (
    <label className="field">
      <span className="field-label">Whose is this?</span>
      <select className="text-input" value={value} onChange={(e) => onChange(e.target.value as 'taxpayer' | 'spouse')} data-testid="owner">
        <option value="taxpayer">Mine</option>
        <option value="spouse">My spouse&rsquo;s</option>
      </select>
    </label>
  );
}

function DeductionCompare({ std, item, uses }: { std: number; item: number; uses: boolean }) {
  const max = Math.max(std, item, 1);
  return (
    <div className="compare" data-testid="deduction-compare">
      <div className={!uses ? 'bar win' : 'bar'}><span>Standard</span><div style={{ width: `${(std / max) * 100}%` }} /><strong>{fmt(std)}</strong></div>
      <div className={uses ? 'bar win' : 'bar'}><span>Itemized</span><div style={{ width: `${(item / max) * 100}%` }} /><strong>{fmt(item)}</strong></div>
      <p className="muted small" data-testid="deduction-choice">Using the <b>{uses ? 'itemized' : 'standard'}</b> deduction.</p>
    </div>
  );
}

function ItemizedForm({ data, up, salt, saltTotal, medFloor }: { data: TaxReturnInput; up: (p: Partial<TaxReturnInput>) => void; salt: number; saltTotal: number; medFloor: number }) {
  const it = data.itemized;
  const set = (p: Partial<typeof it>) => up({ itemized: { ...it, ...p } });
  return (
    <div className="itemized">
      <div className="item-card">
        <h3>Medical and dental</h3>
        <Money label="Unreimbursed medical and dental expenses" value={it.medical} onChange={(n) => set({ medical: n })} hint={`Only the part above ${fmt(medFloor)} (7.5% of AGI) counts.`} testId="medical" />
      </div>
      <div className="item-card">
        <h3>Taxes you paid</h3>
        <div className="grid3">
          <Money label={it.useSalesTax ? 'State and local general sales tax' : 'State and local income tax'} value={it.stateLocalIncomeOrSalesTax} onChange={(n) => set({ stateLocalIncomeOrSalesTax: n })} testId="salt-income" />
          <Money label="Real estate tax" value={it.realEstateTax} onChange={(n) => set({ realEstateTax: n })} testId="salt-property" />
          <Money label="Personal property tax" value={it.personalPropertyTax} onChange={(n) => set({ personalPropertyTax: n })} />
        </div>
        <Check label="Deduct general sales tax instead of income tax" checked={it.useSalesTax} onChange={(b) => set({ useSalesTax: b })} />
        <p className="muted small">2025 SALT limit: $40,000 ($20,000 MFS), reduced by 30% of AGI over $500,000 ($250,000 MFS) but not below $10,000 ($5,000 MFS). You entered {fmt(saltTotal)}; deductible {fmt(salt)}.</p>
        <Money label="Other deductible taxes (e.g., foreign income tax)" value={it.otherTaxes} onChange={(n) => set({ otherTaxes: n })} />
      </div>
      <div className="item-card">
        <h3>Interest you paid</h3>
        <div className="grid3">
          <Money label="Mortgage interest & points on Form 1098" value={it.mortgageInterest1098} onChange={(n) => set({ mortgageInterest1098: n })} testId="mortgage" hint="Deductible portion (loans up to $750,000)." />
          <Money label="Mortgage interest not on a 1098" value={it.mortgageInterestNo1098} onChange={(n) => set({ mortgageInterestNo1098: n })} />
          <Money label="Points not on a 1098" value={it.pointsNo1098} onChange={(n) => set({ pointsNo1098: n })} />
          <Money label="Average acquisition-debt balance" value={it.mortgageAverageBalance} onChange={(n) => set({ mortgageAverageBalance: n })} hint="Leave $0 if the interest you entered is already limited to the $750,000 ($375,000 MFS) cap. Pre-2017 $1 million grandfathering is not applied." />
          <Money label="Investment interest" value={it.investmentInterest} onChange={(n) => set({ investmentInterest: n })} />
          <Money label="Investment interest carryover from 2024" value={it.investmentInterestCarryover} onChange={(n) => set({ investmentInterestCarryover: n })} />
        </div>
      </div>
      <div className="item-card">
        <h3>Gifts to charity</h3>
        <div className="grid3">
          <Money label="Cash or check" value={it.charityCash} onChange={(n) => set({ charityCash: n })} testId="charity-cash" />
          <Money label="Other than cash" value={it.charityNonCash} onChange={(n) => set({ charityNonCash: n })} testId="charity-noncash" />
          <Money label="Carryover from prior year" value={it.charityCarryover} onChange={(n) => set({ charityCarryover: n })} />
        </div>
      </div>
      <div className="item-card">
        <h3>Other</h3>
        <div className="grid2">
          <Money label="Casualty/theft loss from a federally declared disaster (Form 4684)" value={it.casualtyLoss} onChange={(n) => set({ casualtyLoss: n })} />
          <Money label="Other itemized deductions (Schedule A line 16)" value={it.otherItemized} onChange={(n) => set({ otherItemized: n })} />
          <Money label="Qualified car-loan interest (Schedule 1-A)" value={data.carLoanInterest} onChange={(n) => up({ carLoanInterest: n })} hint="New personal-use U.S.-assembled vehicle, loan originated after 2024. Cap $10,000; phases out above $100,000 MAGI ($200,000 joint)." testId="car-loan" />
        </div>
      </div>
    </div>
  );
}

const EXPENSES: [keyof Business['expenses'], string][] = [
  ['advertising', 'Advertising'], ['carTruck', 'Car and truck'], ['commissionsFees', 'Commissions and fees'], ['contractLabor', 'Contract labor'],
  ['depletion', 'Depletion'], ['depreciation', 'Depreciation and §179'], ['employeeBenefits', 'Employee benefit programs'], ['insurance', 'Insurance (not health)'],
  ['mortgageInterest', 'Mortgage interest (business)'], ['otherInterest', 'Other interest'], ['legalProfessional', 'Legal and professional'], ['officeExpense', 'Office expense'],
  ['pensionProfitSharing', 'Pension and profit-sharing'], ['rentVehicles', 'Rent: vehicles & equipment'], ['rentOther', 'Rent: other property'], ['repairs', 'Repairs and maintenance'],
  ['supplies', 'Supplies'], ['taxesLicenses', 'Taxes and licenses'], ['travel', 'Travel'], ['mealsTotal', 'Business meals (total paid; 50% deducted)'],
  ['utilities', 'Utilities'], ['wages', 'Wages paid to employees'], ['otherExpenses', 'Other expenses'],
];

function BusinessCard({ b, i, joint, profit, onChange, onRemove }: { b: Business; i: number; joint: boolean; profit: number; onChange: (b: Business) => void; onRemove: () => void }) {
  const set = (p: Partial<Business>) => onChange({ ...b, ...p });
  const setE = (k: keyof Business['expenses'], n: number) => onChange({ ...b, expenses: { ...b.expenses, [k]: n } });
  const setC = (p: Partial<Business['cogs']>) => onChange({ ...b, cogs: { ...b.cogs, ...p } });
  return (
    <div className="item-card" data-testid={`biz-${i}`}>
      <div className="grid2">
        <Text label="Business name or description" value={b.name} onChange={(v) => set({ name: v })} testId={`biz-${i}-name`} />
        {joint && <OwnerPick value={b.owner} onChange={(o) => set({ owner: o })} />}
      </div>
      <h4>Income</h4>
      <div className="grid3">
        <Money label="Gross receipts or sales (line 1)" value={b.grossReceipts} onChange={(n) => set({ grossReceipts: n })} testId={`biz-${i}-gross`} />
        <Money label="Returns and allowances (line 2)" value={b.returnsAllowances} onChange={(n) => set({ returnsAllowances: n })} />
        <Money label="Other business income (line 6)" value={b.otherIncome} onChange={(n) => set({ otherIncome: n })} />
      </div>
      <Check label="This business sells products or keeps inventory (cost of goods sold)" checked={b.hasInventory} onChange={(v) => set({ hasInventory: v })} testId={`biz-${i}-inventory`} />
      {b.hasInventory && (
        <div className="grid3 sub">
          <Money label="Inventory at start of year" value={b.cogs.beginningInventory} onChange={(n) => setC({ beginningInventory: n })} testId={`biz-${i}-inv-begin`} />
          <Money label="Purchases" value={b.cogs.purchases} onChange={(n) => setC({ purchases: n })} testId={`biz-${i}-purchases`} />
          <Money label="Cost of labor" value={b.cogs.costOfLabor} onChange={(n) => setC({ costOfLabor: n })} />
          <Money label="Materials and supplies" value={b.cogs.materialsSupplies} onChange={(n) => setC({ materialsSupplies: n })} />
          <Money label="Other costs" value={b.cogs.otherCosts} onChange={(n) => setC({ otherCosts: n })} />
          <Money label="Inventory at end of year" value={b.cogs.endingInventory} onChange={(n) => setC({ endingInventory: n })} testId={`biz-${i}-inv-end`} />
        </div>
      )}
      <h4>Expenses</h4>
      <div className="grid3">
        {EXPENSES.map(([k, label]) => (
          <Money key={k} label={label} value={b.expenses[k]} onChange={(n) => setE(k, n)} testId={`biz-${i}-${k}`} />
        ))}
        <Money label="Business use of home (line 30)" value={b.homeOffice} onChange={(n) => set({ homeOffice: n })} />
      </div>
      <h4>QBI, tips, and self-employed benefits</h4>
      <Check label="This is a specified service trade or business (health, law, consulting, financial services, athletics, performing arts)" checked={b.isSstb} onChange={(v) => set({ isSstb: v })} testId={`biz-${i}-sstb`} />
      <div className="grid3">
        <Money label="UBIA of qualified property (Form 8995-A)" value={b.ubia} onChange={(n) => set({ ubia: n })} hint="Unadjusted basis of depreciable property. Employee W-2 wages on line 26 are the wage base." />
        <Money label="Qualified tips received in this business" value={b.qualifiedTips} onChange={(n) => set({ qualifiedTips: n })} />
        <Money label="Self-employed health insurance premiums" value={b.seHealthInsurance} onChange={(n) => set({ seHealthInsurance: n })} testId={`biz-${i}-health`} />
        <Money label="SEP / solo 401(k) employer contribution requested" value={b.sepOrSoloEmployer} onChange={(n) => set({ sepOrSoloEmployer: n })} />
        <Money label="Solo 401(k) elective deferral requested" value={b.solo401kElective} onChange={(n) => set({ solo401kElective: n })} />
      </div>
      <p className="profit" data-testid={`biz-${i}-profit`}>Net {profit < 0 ? 'loss' : 'profit'}: <b>{fmt(profit)}</b></p>
      <button className="link danger" onClick={onRemove}>Remove this business</button>
    </div>
  );
}
