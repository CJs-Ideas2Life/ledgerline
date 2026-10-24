// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { RulesWhy } from '@/components/RulesWhy';
import { SiteFooter } from '@/components/SiteFooter';

export default function RulesPage() {
  const [hash, setHash] = useState('');
  useEffect(() => {
    const apply = () => setHash(window.location.hash.replace(/^#/, ''));
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ block: 'start' });
  }, [hash]);
  return (
    <main className="rules-wrap">
      <div className="print-toolbar">
        <a href="/" className="btn ghost">← Back to my return</a>
      </div>
      <RulesWhy highlightId={hash} />
      <SiteFooter />
    </main>
  );
}
