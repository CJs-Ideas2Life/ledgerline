import { execFileSync, execSync } from 'node:child_process';
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { acceptDisclaimer } from '../e2e/helpers';

/**
 * Capture README walkthrough pictures from the production build.
 * Uses only obviously fake sample people (Jane Sample / Pat Sample).
 * Does not type Social Security numbers — the app does not ask for them.
 */
const OUT = 'docs/screenshots';

const money = async (page: Page, testId: string, v: number) => page.getByTestId(testId).fill(String(v));

async function settle(page: Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
}

async function shot(page: Page, name: string, target?: Locator, opts?: { fullPage?: boolean }) {
  await settle(page);
  const path = join(OUT, `${name}.png`);
  if (target) {
    await expect(target).toBeVisible();
    await target.screenshot({ path, animations: 'disabled' });
  } else {
    await page.screenshot({ path, animations: 'disabled', caret: 'hide', fullPage: opts?.fullPage ?? false });
  }
}

function optimizeAndPin() {
  const files = readdirSync(OUT).filter((f) => f.endsWith('.png')).sort();
  if (files.length === 0) throw new Error(`No PNGs in ${OUT}`);
  for (const file of files) {
    const path = join(OUT, file);
    try {
      execFileSync('pngquant', ['--quality=65-90', '--speed=1', '--ext', '.png', '--force', path], { stdio: 'pipe' });
    } catch {
      try {
        execFileSync(
          'python3',
          [
            '-c',
            'import sys; from PIL import Image; p=sys.argv[1]; im=Image.open(p); w,h=im.size\n'
            + 'im=im.resize((w,h)) if False else im; im.save(p, format="PNG", optimize=True, compress_level=9)',
            path,
          ],
          { stdio: 'pipe' },
        );
      } catch {
        /* Playwright PNG is already compressed; size check below is the gate. */
      }
    }
    const bytes = statSync(path).size;
    if (bytes > 300_000) {
      throw new Error(`${path} is ${bytes} bytes; keep each PNG under 300 KB`);
    }
  }
  const pins = files.map((file) => {
    const rel = join(OUT, file);
    const hash = execSync(`sha256sum "${rel}"`, { encoding: 'utf8' }).split(/\s+/)[0];
    return `${hash}  ${rel}`;
  });
  writeFileSync('.public-release/binaries.sha256', `${pins.join('\n')}\n`);
}

test('capture grandma-test README screenshots with fake sample data', async ({ page }) => {
  mkdirSync(OUT, { recursive: true });

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('disclaimer-gate')).toBeVisible();
  await shot(page, '01-disclaimer', page.locator('.disclaimer-card'));

  await acceptDisclaimer(page);
  await expect(page.getByTestId('start')).toBeEnabled();
  await shot(page, '02-start-return', undefined, { fullPage: true });

  await page.getByTestId('start').click();
  await expect(page.getByTestId('step-1')).toBeVisible();
  await page.getByTestId('tp-first').fill('Jane');
  await page.getByTestId('tp-last').fill('Sample');
  await page.getByTestId('tp-age').fill('40');
  await page.getByTestId('tp-65-no').click();
  await page.getByTestId('tp-50-no').click();
  await page.getByTestId('tp-blind-no').click();
  await page.getByTestId('tp-ssn-yes').click();
  await page.getByTestId('tp-dependent-no').click();
  await shot(page, '03-about-you');
  await page.getByTestId('continue').click();

  await expect(page.getByTestId('step-2')).toBeVisible();
  await page.getByTestId('has-deps-yes').click();
  await page.getByTestId('dep-0-name').fill('Pat');
  await page.getByLabel('Relationship').fill('Child');
  await page.getByTestId('dep-0-dob').fill('2016-06-01');
  await page.getByTestId('dep-0-under17-yes').click();
  await page.getByTestId('dep-0-eic-yes').click();
  await page.getByTestId('dep-0-student-no').click();
  await page.getByTestId('dep-0-disabled-no').click();
  await page.getByTestId('dep-0-residency-yes').click();
  await page.getByTestId('dep-0-ssn-yes').click();
  await shot(page, '04-household');
  await page.getByTestId('continue').click();

  await expect(page.getByTestId('step-3')).toBeVisible();
  await page.getByTestId('has-w2-yes').click();
  await page.getByTestId('w2-0-employer').fill('Sample Employer Co');
  await money(page, 'w2-0-box1', 42_000);
  await money(page, 'w2-0-box2', 5_500);
  await money(page, 'w2-0-box3', 42_000);
  await money(page, 'w2-0-box4', 2_604);
  await money(page, 'w2-0-box5', 42_000);
  await money(page, 'w2-0-box6', 609);
  await expect(page.getByTestId('meter-amount')).not.toHaveText('—');
  await shot(page, '05-w2');
  await page.getByTestId('continue').click();

  await page.getByTestId('has-inv-no').click();
  await page.getByTestId('continue').click();
  await page.getByTestId('has-biz-no').click();
  await page.getByTestId('continue').click();

  await expect(page.getByTestId('step-6')).toBeVisible();
  await expect(page.getByTestId('deduction-choice')).toContainText('standard');
  await shot(page, '06-deductions');
  await page.getByTestId('continue').click();

  await expect(page.getByTestId('step-7')).toBeVisible();
  await shot(page, '07-payments');
  await shot(page, '08-saved-in-browser', page.getByTestId('meter'));
  await page.getByTestId('continue').click();

  await expect(page.getByTestId('review-hero')).toContainText('Refund');
  await shot(page, '09-review-refund');
  await page.locator('.meter').evaluate((el) => {
    (el as HTMLElement).style.visibility = 'hidden';
  });
  await page.getByTestId('f1040').scrollIntoViewIfNeeded();
  await shot(page, '10-form-1040-lines', page.getByTestId('f1040'));
  await page.locator('.meter').evaluate((el) => {
    (el as HTMLElement).style.visibility = '';
  });

  await page.goto('/print');
  await expect(page.getByTestId('print-page')).toContainText('Jane Sample');
  await expect(page.getByTestId('print-page')).toContainText('not for filing');
  await shot(page, '11-print-summary');

  await page.goto('/');
  await expect(page.getByTestId('review-hero')).toBeVisible();
  await page.getByTestId('nav-7').click();
  await expect(page.getByTestId('step-7')).toBeVisible();
  await page.evaluate(() => {
    const proto = Storage.prototype;
    const original = proto.setItem;
    proto.setItem = function setItem(key: string, value: string) {
      if (key === 'ledgerline.ty2025.v1') {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      }
      return original.call(this, key, value);
    };
  });
  await money(page, 'estimated', 1);
  await expect(page.getByTestId('unsaved-banner')).toBeVisible();
  await expect(page.getByTestId('export-backup')).toBeVisible();
  await shot(page, '12-recovery-download', page.getByTestId('unsaved-banner'));

  await page.goto('/known-issues');
  await expect(page.getByTestId('known-issues-page')).toBeVisible();
  await shot(page, '13-known-issues');

  await page.goto('/rules');
  await expect(page.getByTestId('rules-page')).toBeVisible();
  await shot(page, '14-rules-why');

  await page.goto('/');
  await page.getByTestId('nav-0').click();
  await expect(page.getByTestId('step-0')).toBeVisible();
  await page.getByTestId('site-footer').scrollIntoViewIfNeeded();
  await shot(page, '15-footer-notice', page.getByTestId('site-footer'));

  optimizeAndPin();
});
