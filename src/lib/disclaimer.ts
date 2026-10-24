// SPDX-License-Identifier: AGPL-3.0-or-later

/** localStorage key for the first-run acknowledgment. Return data is stored separately. */
export const DISCLAIMER_STORAGE_KEY = 'ledgerline.disclaimer.v2';

export const DISCLAIMER_ACK_LABEL =
  'I have read the disclaimer and understand Ledgerline is not tax advice and I am solely responsible for my return';

export const FOOTER_SHORT_LINE = 'Free open-source educational tool · Not tax advice · No warranty · Disclaimer';

export const COPYRIGHT_LINE = 'Copyright (C) 2026 The Ledgerline Authors';

/**
 * Short protective paragraphs historically shown in the README, first-run gate, and footer.
 * Keep every sentence. The full DISCLAIMER.md text is additional protection, not a replacement.
 */
export const DISCLAIMER_PARAGRAPHS = [
  'Ledgerline is an educational and tax-preparation aid for the 2025 Form 1040. It is not tax, legal, or financial advice, and it is not a substitute for official IRS forms, instructions, or publications.',
  'There is no warranty of any kind. The software is provided “as is” under the GNU Affero General Public License version 3 or later; see LICENSE sections 15 and 16 for the full warranty disclaimer and limitation of liability.',
  'You are responsible for checking every figure against the IRS instructions and for any return you file. Ledgerline does not e-file.',
  'Ledgerline is not affiliated with, endorsed by, or approved by the Internal Revenue Service or any accounting or law firm.',
  'All data stays in this browser. Ledgerline does not create accounts and does not send your return data to a server.',
] as const;

export const DISCLAIMER_TEXT = DISCLAIMER_PARAGRAPHS.join('\n\n');

/** Verbatim DISCLAIMER.md body used by the first-run scroll box and /disclaimer page. */
export const DISCLAIMER_MARKDOWN = `# ⚠️ Important Disclaimer: read before using Ledgerline

**LEDGERLINE IS A FREE, COMMUNITY, OPEN-SOURCE PROJECT FOR EDUCATIONAL PURPOSES ONLY. USE IT ENTIRELY AT YOUR OWN RISK.**

Ledgerline is public, open-source software released under the GNU Affero General Public License v3.0 or later. Anyone may use, copy, change and share it. It is not a commercial product, it isn't sold, and no person or company stands behind it as a tax-preparation service.

### Not tax, legal, accounting or financial advice
Nothing in this software, its calculations, its documentation or its repository is tax, legal, accounting, investment or financial advice. It is a learning aid that shows how parts of the 2025 U.S. Form 1040 can be calculated. It is **not** a substitute for official IRS forms, instructions and publications, or for a qualified professional.

### No professional relationship
Using, downloading or relying on Ledgerline does **not** create a CPA-client, enrolled agent-client, attorney-client, tax preparer-client, fiduciary or any other professional relationship with anyone involved in the project. No licensed professional prepared, reviewed, signed or approved any return, figure or result Ledgerline produces. Ledgerline does not provide "written advice" under Treasury Circular 230. Nobody involved acts as your preparer, adviser or representative.

### Not prepared or endorsed by any firm
Ledgerline is not a product or service of, and is not prepared, reviewed, endorsed or supported by, any accounting firm, CPA firm, law firm, tax-preparation business or employer of anyone who has contributed to it. It is not affiliated with, endorsed by or approved by the Internal Revenue Service, any state tax agency, or any commercial tax-software company.

### No warranty; results may be wrong
Ledgerline is provided **"as is" and "as available," without warranty of any kind**, express or implied, including accuracy, completeness, fitness for a particular purpose or non-infringement (see LICENSE sections 15 and 16).
- The software is **incomplete**. Many forms, schedules, credits, situations and state returns are not supported (see the Known Limits section).
- Tax law and IRS guidance change. The figures may be **outdated, incomplete or simply wrong**.
- Parts of this project were written or checked with the help of AI tools. AI-generated code and content can contain errors.

### Your responsibility
**You are solely responsible** for every figure you rely on and every return you file. Check every number against current IRS forms and instructions, or have a qualified, licensed tax professional prepare or review your return. Ledgerline does **not** e-file, does not submit anything to the IRS, and does not check whether you are eligible for any deduction or credit.

### No liability
To the fullest extent permitted by law, the authors, contributors, maintainers and anyone who distributes Ledgerline **are not liable** for any taxes, penalties, interest, audit costs, lost refunds, or direct, indirect, incidental, consequential or other damages arising from using it or being unable to use it, even if advised of the possibility. If you don't accept these terms, don't use Ledgerline.

### Your data
Ledgerline runs entirely in your browser. It creates no accounts and sends nothing to a server. Your entries are stored only in your browser's local storage, and in any recovery file you choose to download. You are responsible for protecting your device and those files.

### Open source and contributions
This is a community project. Content may contain errors or become outdated. Contributions are welcome under the project's contribution terms, and are also provided without warranty.

_Copyright © 2026 The Ledgerline Authors. Licensed under AGPL-3.0-or-later._
`;

export function hasAcknowledgedDisclaimer(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(DISCLAIMER_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { acknowledgedAt?: unknown };
    return typeof parsed.acknowledgedAt === 'string' && parsed.acknowledgedAt.length > 0;
  } catch {
    return false;
  }
}

export function acknowledgeDisclaimer(): string {
  const acknowledgedAt = new Date().toISOString();
  try {
    window.localStorage.setItem(DISCLAIMER_STORAGE_KEY, JSON.stringify({ acknowledgedAt }));
  } catch {
    /* storage full or disabled */
  }
  return acknowledgedAt;
}
