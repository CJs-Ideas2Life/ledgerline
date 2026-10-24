import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  COPYRIGHT_LINE,
  DISCLAIMER_ACK_LABEL,
  DISCLAIMER_MARKDOWN,
  DISCLAIMER_PARAGRAPHS,
  DISCLAIMER_STORAGE_KEY,
} from '../src/lib/disclaimer';

const root = resolve(__dirname, '..');

function blockedNeedles(): string[] {
  return [
    ['chris', 'johnson'].join(' '),
    ['model', 'user', '123'].join(''),
    ['cjtx', 'audit'].join(''),
    ['CJ', ' CPA'].join(''),
    ['CJ', ' CPAs'].join(''),
  ];
}

function grepOrEmpty(args: string[]): string {
  try {
    return execFileSync('grep', args, { cwd: root, encoding: 'utf8' }).trim();
  } catch (error) {
    const err = error as { status?: number; stdout?: string };
    if (err.status === 1) return (err.stdout ?? '').trim();
    throw error;
  }
}

describe('disclaimer notices', () => {
  const file = readFileSync(resolve(root, 'DISCLAIMER.md'), 'utf8');
  const notice = readFileSync(resolve(root, 'NOTICE'), 'utf8');
  const readme = readFileSync(resolve(root, 'README.md'), 'utf8');
  const allowlist = readFileSync(resolve(root, '.public-release/allowlist.txt'), 'utf8');
  const required = readFileSync(resolve(root, '.public-release/required-notices.txt'), 'utf8');
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { author?: string; license?: string };
  const footer = readFileSync(resolve(root, 'src/components/SiteFooter.tsx'), 'utf8');
  const gate = readFileSync(resolve(root, 'src/components/DisclaimerGate.tsx'), 'utf8');

  it('keeps DISCLAIMER.md verbatim with the in-app markdown', () => {
    expect(file).toBe(DISCLAIMER_MARKDOWN);
    expect(file).toContain('USE IT ENTIRELY AT YOUR OWN RISK');
    expect(file).toContain('No professional relationship');
    expect(file).toMatch(/Copyright © 2026 The Ledgerline Authors/);
  });

  it('sets the copyright holder and package metadata', () => {
    expect(COPYRIGHT_LINE).toBe('Copyright (C) 2026 The Ledgerline Authors');
    expect(notice.startsWith(`${COPYRIGHT_LINE}\n`)).toBe(true);
    expect(readme).toContain(COPYRIGHT_LINE);
    expect(readme).toContain('```\nCopyright (C) 2026 The Ledgerline Authors\n');
    expect(footer).toContain('COPYRIGHT_LINE');
    expect(pkg.author).toBe('The Ledgerline Authors');
    expect(pkg.license).toBe('AGPL-3.0-or-later');
  });

  it('ships DISCLAIMER.md on the public allowlist and required notices', () => {
    expect(allowlist).toMatch(/^DISCLAIMER\.md$/m);
    expect(required).toMatch(/^DISCLAIMER\.md$/m);
  });

  it('bumps the first-run key and requires the full checkbox label', () => {
    expect(DISCLAIMER_STORAGE_KEY).toBe('ledgerline.disclaimer.v2');
    expect(DISCLAIMER_ACK_LABEL).toBe(
      'I have read the disclaimer and understand Ledgerline is not tax advice and I am solely responsible for my return',
    );
    expect(gate).toContain('DISCLAIMER_ACK_LABEL');
    expect(gate).toContain('disclaimer-scroll');
    expect(readme).toContain('ledgerline.disclaimer.v2');
    expect(readme).not.toContain('ledgerline.disclaimer.v1');
  });

  it('never drops the original protective paragraphs', () => {
    expect(DISCLAIMER_PARAGRAPHS).toHaveLength(5);
    for (const paragraph of DISCLAIMER_PARAGRAPHS) {
      expect(readme).toContain(paragraph);
      expect(DISCLAIMER_MARKDOWN.length).toBeGreaterThan(paragraph.length);
    }
  });
});

describe('blocked personal-name strings', () => {
  const pattern = blockedNeedles()
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  it('are absent from allowlisted export paths', () => {
    const paths = readFileSync(resolve(root, '.public-release/allowlist.txt'), 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
    const hits = grepOrEmpty(['-rniIE', pattern, '--', ...paths]);
    expect(hits, hits).toBe('');
  });

  it('are absent from git-tracked text files', () => {
    try {
      const hits = execFileSync('git', ['grep', '-nI', '-i', '-E', pattern], { cwd: root, encoding: 'utf8' }).trim();
      expect(hits, hits).toBe('');
    } catch (error) {
      const err = error as { status?: number };
      if (err.status !== 1) throw error;
    }
  });
});
