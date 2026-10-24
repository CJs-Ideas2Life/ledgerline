import { expect, type Page } from '@playwright/test';

export async function acceptDisclaimer(page: Page) {
  await expect(page.getByTestId('disclaimer-gate')).toBeVisible();
  await page.getByTestId('disclaimer-ack').check();
  await page.getByTestId('disclaimer-accept').click();
  await expect(page.getByTestId('disclaimer-gate')).toHaveCount(0);
}
