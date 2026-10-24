import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DISCLAIMER_PARAGRAPHS } from '../src/lib/disclaimer';
import { RULES } from '../src/engine/rules';

const root = resolve(__dirname, '..');

describe('KNOWN_ISSUES.md', () => {
  const known = readFileSync(resolve(root, 'KNOWN_ISSUES.md'), 'utf8');
  const readme = readFileSync(resolve(root, 'README.md'), 'utf8');
  const page = readFileSync(resolve(root, 'src/app/known-issues/page.tsx'), 'utf8');
  const allowlist = readFileSync(resolve(root, '.public-release/allowlist.txt'), 'utf8');

  it('quotes every Rules & Why registry simplification', () => {
    const simplifications = RULES.filter((r) => r.simplification);
    expect(simplifications.length).toBeGreaterThan(10);
    for (const r of simplifications) {
      expect(known, `missing simplification for ${r.id}`).toContain(r.simplification);
    }
  });

  it('does not list the closed calculation issues or link the private repo', () => {
    const privateOwner = ['Model', 'User', '123'].join('');
    const privateRepo = new RegExp(`github\\.com/${privateOwner}`, 'i');
    expect(known).not.toMatch(privateRepo);
    expect(readme).not.toMatch(privateRepo);
    expect(page).not.toMatch(privateRepo);
    expect(known).not.toMatch(/#1[6-9]\b|#20\b/);
    expect(known).not.toMatch(/NEXT_PUBLIC_LEDGERLINE_PREVIEW/);
    expect(known).not.toMatch(/do not use to file/i);
  });

  it('documents scorecard items that stay out of product scope', () => {
    expect(known).toMatch(/Official IRS forms and e-file/);
    expect(known).toMatch(/Form 8615 \/ Form 8814/);
    expect(known).toMatch(/plaintext `localStorage`/);
    expect(known).toMatch(/No client picker/);
    expect(page).toContain('known-issues-product-scope');
    expect(page).toContain('scope-encryption');
  });

  it('is linked from the README and the public-release allowlist', () => {
    expect(readme).toMatch(/## Known issues/);
    expect(readme).toContain('KNOWN_ISSUES.md');
    expect(readme).toContain('/known-issues');
    expect(readme).toContain('Clear data in this browser');
    expect(readme).not.toMatch(/NEXT_PUBLIC_LEDGERLINE_PREVIEW/);
    expect(allowlist).toMatch(/^KNOWN_ISSUES\.md$/m);
  });

  it('keeps every first-run disclaimer paragraph verbatim in the README', () => {
    for (const paragraph of DISCLAIMER_PARAGRAPHS) {
      expect(readme, `README missing disclaimer paragraph: ${paragraph.slice(0, 48)}…`).toContain(paragraph);
    }
    expect(readme).toContain('DISCLAIMER.md');
    expect(readme.startsWith('# Ledgerline\n\n**⚠️ Free, open-source educational tool.')).toBe(true);
    expect(readme).toContain('USE IT ENTIRELY AT YOUR OWN RISK');
    expect(readme).toContain('You are solely responsible');
  });

  it('declares side-effect CSS modules so TypeScript 7 typecheck can pass', () => {
    const css = readFileSync(resolve(root, 'src/css-modules.d.ts'), 'utf8');
    expect(css).toMatch(/declare module '\*\.css'/);
    expect(readFileSync(resolve(root, 'src/app/layout.tsx'), 'utf8')).toMatch(/import '\.\/globals\.css'/);
  });

  it('embeds the grandma-test screenshots with working relative paths', () => {
    const dir = resolve(root, 'docs/screenshots');
    const pngs = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
    expect(pngs.length).toBeGreaterThanOrEqual(10);
    expect(pngs.length).toBeLessThanOrEqual(15);
    expect(allowlist).toMatch(/^docs\/screenshots$/m);
    for (const file of pngs) {
      const rel = `docs/screenshots/${file}`;
      expect(readme, `README does not reference ${rel}`).toContain(rel);
      const bytes = statSync(join(dir, file)).size;
      expect(bytes, `${rel} should stay under 300 KB`).toBeGreaterThan(0);
      expect(bytes, `${rel} should stay under 300 KB`).toBeLessThanOrEqual(300_000);
    }
    const mentioned = [...readme.matchAll(/docs\/screenshots\/[A-Za-z0-9._-]+\.png/g)].map((m) => m[0]);
    expect(new Set(mentioned).size).toBe(pngs.length);
  });
});
