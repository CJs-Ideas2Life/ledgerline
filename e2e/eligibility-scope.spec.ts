import { expect, test } from '@playwright/test';
import { acceptDisclaimer } from './helpers';

test('unanswered eligibility: $8,000 W-2 does not become a $614 refund or completed steps', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await acceptDisclaimer(page);
  await page.getByTestId('start').click();
  // Jump to Wages without answering About you / Family.
  await page.getByTestId('nav-3').click();
  await page.getByTestId('has-w2-yes').click();
  await page.getByTestId('w2-0-box1').fill('8000');
  await expect(page.getByTestId('meter-scope')).toHaveText(/incomplete|invalid|blocked/i);
  await expect(page.getByTestId('meter')).not.toContainText('$614');
  await expect(page.getByTestId('nav-1')).not.toHaveClass(/done/);
  await expect(page.getByTestId('nav-2')).not.toHaveClass(/done/);
  await page.getByTestId('nav-8').click();
  await expect(page.getByTestId('scope-status')).toContainText('incomplete');
  await expect(page.getByTestId('review-claim')).not.toContainText('Refund $614');
  await expect(page.getByTestId('nav-1')).not.toHaveClass(/done/);
  await expect(page.getByTestId('nav-4')).not.toHaveClass(/done/);
  await expect(page.getByTestId('nav-7')).not.toHaveClass(/done/);
});

test('junk money input shows an error instead of silently parsing', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await acceptDisclaimer(page);
  await page.getByTestId('start').click();
  await page.getByTestId('nav-3').click();
  await page.getByTestId('has-w2-yes').click();
  await page.getByTestId('w2-0-box1').fill('40000oops');
  await expect(page.getByTestId('w2-0-box1-error')).toBeVisible();
  await expect(page.getByTestId('meter-scope')).toHaveText(/invalid/i);
});

test('failed localStorage write shows unsaved recovery, not a saved timestamp', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await acceptDisclaimer(page);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' });
    };
  });
  await page.getByTestId('start').click();
  await page.getByTestId('tp-first').fill('Ada');
  await expect(page.getByTestId('unsaved-banner')).toBeVisible();
  await expect(page.getByTestId('save-indicator')).toContainText('Unsaved');
  await expect(page.getByTestId('export-backup')).toBeVisible();
  await expect(page.getByTestId('export-privacy')).toHaveText(
    'This file contains your tax information; store it somewhere private.',
  );
});

test('clear-data button erases the draft and requires the disclaimer again', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await acceptDisclaimer(page);
  await page.getByTestId('start').click();
  await page.getByTestId('tp-first').fill('Ada');
  await expect(page.getByTestId('save-indicator')).toContainText('Saved in this browser');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByTestId('nav-0').click();
  await page.getByTestId('clear-data').click();
  await expect(page.getByTestId('disclaimer-gate')).toBeVisible();
  const leftover = await page.evaluate(() => ({
    draft: localStorage.getItem('ledgerline.ty2025.v1'),
    ack: localStorage.getItem('ledgerline.disclaimer.v2'),
  }));
  expect(leftover.draft).toBeNull();
  expect(leftover.ack).toBeNull();
});

test('collectibles block a complete refund claim', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await acceptDisclaimer(page);
  await page.getByTestId('start').click();
  await page.getByTestId('tp-age').fill('40');
  await page.getByTestId('tp-ssn-yes').click();
  await page.getByTestId('tp-dependent-no').click();
  await page.getByTestId('nav-4').click();
  await page.getByTestId('has-inv-yes').click();
  await page.getByTestId('add-cg').click();
  await page.getByTestId('cg-0-proceeds').fill('6000');
  await page.getByTestId('cg-0-cost').fill('2000');
  await page.getByLabel('Collectible (art, coins, precious metals)').check();
  await page.getByTestId('nav-8').click();
  await expect(page.getByTestId('scope-status')).toContainText('blocked');
  await expect(page.getByTestId('review-claim')).toContainText('Not a complete result');
});
