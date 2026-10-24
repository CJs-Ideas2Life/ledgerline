// SPDX-License-Identifier: AGPL-3.0-or-later
import { RULES } from '@/engine/rules';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata = {
  title: 'Known issues · Ledgerline',
  description: 'Documented engine simplifications and scope limits.',
};

export default function KnownIssuesPage() {
  const simplifications = RULES.filter((r) => r.simplification);
  return (
    <main className="known-issues-page" data-testid="known-issues-page">
      <div className="print-toolbar">
        <a href="/" className="btn ghost">← Back to my return</a>
        <a href="/rules" className="btn">Rules &amp; Why</a>
      </div>
      <header>
        <p className="eyebrow">Ledgerline · 2025 Form 1040</p>
        <h1 id="known-issues">Known issues</h1>
        <p className="lead" data-testid="known-issues-intro">
          Documented simplifications — intentional scope limits, not a complete-return claim.
          Ledgerline is an educational aid, not a substitute for official IRS forms or publications,
          and it is not affiliated with the IRS.
        </p>
      </header>

      <section id="simplifications" data-testid="known-issues-simplifications">
        <h2>Documented simplifications</h2>
        <p className="muted">
          These come from the Rules &amp; Why registry and the README. The live rule cards are on{' '}
          <a href="/rules">Rules &amp; Why</a>.
        </p>
        <ul className="simp-list">
          {simplifications.map((r) => (
            <li key={r.id} data-testid={`simp-${r.id}`}>
              <a href={`/rules#${r.id}`}>{r.topic}</a>
              {' — '}
              {r.simplification}
            </li>
          ))}
          <li data-testid="simp-readme-out-of-scope">
            Also out of scope (README): education and other Schedule 3 credits, Form 1116, state
            returns, and e-file.
          </li>
        </ul>
      </section>

      <section id="product-scope" data-testid="known-issues-product-scope">
        <h2>Out of scope for this product</h2>
        <p className="muted">
          Ledgerline is a browser educational aid. These items are not planned as filing-software
          features. They are listed so a complete official return or e-file claim cannot be inferred.
        </p>
        <ul className="simp-list">
          <li data-testid="scope-official-forms">No official IRS form PDF and no e-file / MeF submission. The print page is an estimate.</li>
          <li data-testid="scope-8615">Form 8615 / Form 8814 (kiddie tax) are not prepared.</li>
          <li data-testid="scope-k1">No S corporation, Schedule K-1, or shareholder basis engine.</li>
          <li data-testid="scope-rental">No rental / passive-activity (Schedule E / Form 8582) engine.</li>
          <li data-testid="scope-intake">No document intake, OCR, or prior-return upload.</li>
          <li data-testid="scope-encryption">Drafts are plaintext in this browser. No encrypted vault, preferred save folder, or sanitized sharing copy.</li>
          <li data-testid="scope-practice">No multi-client practice workflow.</li>
        </ul>
      </section>

      <p className="muted small">
        The repository copy of this list is <code>KNOWN_ISSUES.md</code>.
      </p>
      <SiteFooter />
    </main>
  );
}
