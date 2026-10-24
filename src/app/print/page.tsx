// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { computeReturn, type TaxReturnInput } from '@/engine';
import { activeInput, loadState, type Interview } from '@/lib/storage';
import { Review } from '@/components/Review';
import { SiteFooter } from '@/components/SiteFooter';

export default function PrintPage() {
  const [data, setData] = useState<TaxReturnInput | null>(null);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [ready, setReady] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  useEffect(() => {
    const loaded = loadState();
    if (loaded.status === 'ok') {
      setData(loaded.data);
      setInterview(loaded.interview);
    } else if (loaded.status === 'invalid') {
      setErrors(loaded.errors);
    }
    setReady(true);
  }, []);
  if (!ready) return null;
  if (errors.length) {
    return (
      <main className="print-page" data-testid="print-page">
        <p>Saved work could not be loaded.</p>
        <ul>{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        <p><a href="/">Return to the interview</a>.</p>
        <SiteFooter />
      </main>
    );
  }
  if (!data || !interview) return <main className="print-page"><p>No return saved in this browser yet. <a href="/">Start one</a>.</p><SiteFooter /></main>;
  const result = computeReturn(activeInput(data, interview));
  return (
    <main className="print-page" data-testid="print-page">
      <div className="print-toolbar no-print">
        <a href="/" className="btn ghost">← Back to my return</a>
        <button className="btn primary" onClick={() => window.print()}>Print</button>
      </div>
      <header className="print-head">
        <h1>2025 Form 1040 summary</h1>
        <p>
          {[data.taxpayer.firstName, data.taxpayer.lastName].filter(Boolean).join(' ')}
          {data.filingStatus === 'mfj' && data.spouse.firstName ? ` & ${data.spouse.firstName} ${data.spouse.lastName}` : ''} · Prepared {new Date().toLocaleDateString('en-US')} with Ledgerline (estimate, not for filing)
        </p>
        <p data-testid="print-scope">Scope: {result.scope.status}{result.scope.status === 'complete' ? '' : ' — not a complete refund, tax, or owed claim.'}</p>
      </header>
      <Review data={activeInput(data, interview)} result={result} />
      <SiteFooter />
    </main>
  );
}
