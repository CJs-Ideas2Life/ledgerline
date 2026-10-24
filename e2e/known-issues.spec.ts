import { expect, test } from '@playwright/test';
import { acceptDisclaimer } from './helpers';

test('known-issues page lists documented simplifications and is reachable', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await acceptDisclaimer(page);

  await expect(page.getByTestId('preview-banner')).toHaveCount(0);
  await expect(page.getByTestId('disclaimer-preview-warning')).toHaveCount(0);

  await page.goto('/known-issues');
  await expect(page.getByTestId('known-issues-page')).toBeVisible();
  await expect(page.getByTestId('known-issues-intro')).toContainText('Documented simplifications');
  await expect(page.getByTestId('known-issues-simplifications')).toBeVisible();
  await expect(page.getByTestId('simp-mortgage-debt-cap')).toBeVisible();
  await expect(page.getByTestId('simp-eic-32')).toBeVisible();
  await expect(page.getByTestId('simp-readme-out-of-scope')).toContainText('Form 1116');
  await expect(page.getByTestId('known-issues-product-scope')).toContainText('plaintext');
  await expect(page.getByTestId('scope-official-forms')).toContainText('e-file');
  await expect(page.getByTestId('scope-8615')).toContainText('8615');
  await expect(page.getByTestId('preview-banner')).toHaveCount(0);
  const privateOwner = ['Model', 'User', '123'].join('');
  await expect(page.locator(`a[href*="${privateOwner}"]`)).toHaveCount(0);
  await expect(page.getByTestId('known-issues-open-gaps')).toHaveCount(0);
});
