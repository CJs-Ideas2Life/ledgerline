import { expect, test } from '@playwright/test';
import { acceptDisclaimer } from './helpers';

test('first-run disclaimer must be acknowledged before a return is created', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.getByTestId('disclaimer-gate')).toBeVisible();
  await expect(page.getByTestId('disclaimer-scroll')).toBeVisible();
  await expect(page.getByTestId('disclaimer-text')).toContainText('USE IT ENTIRELY AT YOUR OWN RISK');
  await expect(page.getByTestId('disclaimer-text')).toContainText('tax, legal, accounting, investment or financial advice');
  await expect(page.getByTestId('disclaimer-text')).toContainText('Not tax, legal, accounting or financial advice');
  await expect(page.getByTestId('disclaimer-text')).toContainText('does not e-file');
  await expect(page.getByTestId('disclaimer-text')).toContainText('Your entries are stored only in your browser');
  await expect(page.getByTestId('disclaimer-ack-label')).toContainText(
    'I have read the disclaimer and understand Ledgerline is not tax advice and I am solely responsible for my return',
  );
  await expect(page.getByTestId('disclaimer-accept')).toBeDisabled();
  await expect(page.getByTestId('start')).toBeDisabled();
  await expect(page.getByTestId('load-sample')).toBeDisabled();

  await page.getByTestId('start').click({ force: true });
  await expect(page.getByTestId('step-0')).toBeVisible();
  await expect(page.getByTestId('tp-first')).toHaveCount(0);
  await page.getByTestId('load-sample').click({ force: true });
  await expect(page.getByTestId('step-0')).toBeVisible();

  await page.getByTestId('disclaimer-ack').check();
  await page.getByTestId('disclaimer-accept').click();
  await expect(page.getByTestId('disclaimer-gate')).toHaveCount(0);

  const stored = await page.evaluate(() => localStorage.getItem('ledgerline.disclaimer.v2'));
  expect(stored).toBeTruthy();
  expect(JSON.parse(stored as string).acknowledgedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  const stale = await page.evaluate(() => localStorage.getItem('ledgerline.disclaimer.v1'));
  expect(stale).toBeNull();

  await expect(page.getByTestId('start')).toBeEnabled();
  await expect(page.getByTestId('load-sample')).toBeEnabled();
  await page.getByTestId('start').click();
  await expect(page.getByTestId('step-1')).toBeVisible();
  await expect(page.getByTestId('tp-first')).toBeVisible();

  await page.reload();
  await expect(page.getByTestId('disclaimer-gate')).toHaveCount(0);
  await expect(page.getByTestId('step-1')).toBeVisible();
});

test('an older v1 acknowledgment does not skip the current disclaimer', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('ledgerline.disclaimer.v1', JSON.stringify({ acknowledgedAt: '2026-01-01T00:00:00.000Z' }));
  });
  await page.reload();
  await expect(page.getByTestId('disclaimer-gate')).toBeVisible();
  await expect(page.getByTestId('start')).toBeDisabled();
});

test('footer and print view keep the short disclaimer line and link', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await acceptDisclaimer(page);

  await expect(page.getByTestId('about-disclaimer')).toContainText('not tax, legal, or financial advice');
  await expect(page.getByTestId('footer-disclaimer')).toContainText('Free open-source educational tool');
  await expect(page.getByTestId('footer-disclaimer')).toContainText('Not tax advice');
  await expect(page.getByTestId('footer-disclaimer')).toContainText('No warranty');
  await expect(page.getByTestId('site-footer')).toContainText('Copyright (C) 2026 The Ledgerline Authors');
  await expect(page.getByTestId('footer-disclaimer-link')).toHaveAttribute('href', '/disclaimer');

  await page.getByTestId('footer-disclaimer-link').click();
  await expect(page.getByTestId('disclaimer-page')).toBeVisible();
  await expect(page.getByTestId('disclaimer-text')).toContainText('USE IT ENTIRELY AT YOUR OWN RISK');
  await expect(page.getByTestId('disclaimer-text')).toContainText('No professional relationship');

  await page.goto('/print');
  await expect(page.getByTestId('site-footer')).toContainText('Free open-source educational tool');
  await expect(page.getByTestId('footer-disclaimer-link')).toHaveAttribute('href', '/disclaimer');
  await expect(page.getByTestId('site-footer')).toContainText('Copyright (C) 2026 The Ledgerline Authors');
});
