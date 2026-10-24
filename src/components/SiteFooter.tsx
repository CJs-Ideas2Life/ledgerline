// SPDX-License-Identifier: AGPL-3.0-or-later
import { COPYRIGHT_LINE } from '@/lib/disclaimer';

export function SiteFooter() {
  return (
    <footer className="foot" data-testid="site-footer">
      <p className="foot-brand">Ledgerline · 2025 federal estimate · {COPYRIGHT_LINE}</p>
      <p className="foot-short" data-testid="footer-disclaimer">
        Free open-source educational tool · Not tax advice · No warranty ·{' '}
        <a href="/disclaimer" data-testid="footer-disclaimer-link">Disclaimer</a>
      </p>
    </footer>
  );
}
