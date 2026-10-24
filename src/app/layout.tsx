// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ledgerline · 2025 federal tax return',
  description: 'Guided 2025 Form 1040 preparation that runs entirely in your browser.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
