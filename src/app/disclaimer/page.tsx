// SPDX-License-Identifier: AGPL-3.0-or-later
import { DisclaimerDocument } from '@/components/DisclaimerDocument';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata = {
  title: 'Disclaimer · Ledgerline',
  description: 'Read the Ledgerline disclaimer before use.',
};

export default function DisclaimerPage() {
  return (
    <main className="disclaimer-page" data-testid="disclaimer-page">
      <div className="print-toolbar">
        <a href="/" className="btn ghost">← Back to my return</a>
      </div>
      <DisclaimerDocument />
      <SiteFooter />
    </main>
  );
}
