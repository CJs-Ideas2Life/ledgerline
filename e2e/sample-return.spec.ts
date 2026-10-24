import { expect, test, type Page } from '@playwright/test';
import { acceptDisclaimer } from './helpers';

const shot = async (page: Page, name: string) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500); // let bar/meter transitions settle
  await page.screenshot({ path: `artifacts/${name}.png`, fullPage: true });
};
const money = async (page: Page, testId: string, v: number) => page.getByTestId(testId).fill(String(v));
const lineValue = (page: Page, card: string, line: string) => page.getByTestId(card).locator(`tr[data-line="${line}"] td.amt`).first();

test('walk through a sample MFJ return with W-2, Schedule B, Schedule C and itemized deductions', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await acceptDisclaimer(page);
  await expect(page.getByTestId('meter')).toBeVisible();
  await shot(page, '01-welcome');
  await page.getByTestId('start').click();

  // About you
  await page.getByTestId('tp-first').fill('Alex');
  await page.getByTestId('tp-last').fill('Rivera');
  await page.getByTestId('filing-status').locator('[data-value="mfj"]').click();
  await page.getByTestId('tp-age').fill('35');
  await page.getByTestId('tp-ssn-yes').click();
  await page.getByTestId('tp-dependent-no').click();
  await page.getByTestId('sp-first').fill('Jordan');
  await page.getByTestId('sp-age').fill('35');
  await page.getByTestId('sp-ssn-yes').click();
  await shot(page, '02-about-you');
  await page.getByTestId('continue').click();

  // Family
  await page.getByTestId('has-deps-yes').click();
  await page.getByTestId('dep-0-name').fill('Sam');
  await page.getByTestId('dep-0-dob').fill('2015-04-12');
  await page.getByTestId('dep-0-under17-yes').click();
  await page.getByTestId('dep-0-eic-yes').click();
  await page.getByTestId('dep-0-residency-yes').click();
  await page.getByTestId('dep-0-ssn-yes').click();
  await page.getByTestId('add-dep').click();
  await page.getByTestId('dep-1-name').fill('Riley');
  await page.getByTestId('dep-1-dob').fill('2018-09-03');
  await page.getByTestId('dep-1-under17-yes').click();
  await page.getByTestId('dep-1-eic-yes').click();
  await page.getByTestId('dep-1-residency-yes').click();
  await page.getByTestId('dep-1-ssn-yes').click();
  await shot(page, '03-dependents');
  await page.getByTestId('continue').click();

  // Wages
  await page.getByTestId('has-w2-yes').click();
  await page.getByTestId('w2-0-employer').fill('Northwind Logistics');
  await money(page, 'w2-0-box1', 98000);
  await money(page, 'w2-0-box2', 9800);
  await money(page, 'w2-0-box3', 98000);
  await money(page, 'w2-0-box4', 6076);
  await money(page, 'w2-0-box5', 98000);
  await money(page, 'w2-0-box6', 1421);
  await expect(page.getByTestId('meter-amount')).not.toHaveText('$0');
  await shot(page, '04-w2');
  await page.getByTestId('continue').click();

  // Investments (Schedule B)
  await page.getByTestId('has-inv-yes').click();
  await page.getByTestId('int-0-payer').fill('Prairie Savings Bank');
  await money(page, 'int-0-taxable', 1850);
  await page.getByTestId('add-int').click();
  await page.getByTestId('int-1-payer').fill('City Muni Bond Fund');
  await money(page, 'int-1-exempt', 400);
  await page.getByTestId('add-div').click();
  await page.getByTestId('div-0-payer').fill('Lakeshore Brokerage');
  await money(page, 'div-0-ordinary', 2400);
  await money(page, 'div-0-qualified', 1900);
  await money(page, 'div-0-capgain', 300);
  await shot(page, '05-interest-dividends');
  await page.getByTestId('continue').click();

  // Schedule C
  await page.getByTestId('has-biz-yes').click();
  await page.getByTestId('biz-0-name').fill('Rivera Design Studio');
  await page.getByTestId('biz-0').getByTestId('owner').selectOption('spouse');
  await money(page, 'biz-0-gross', 72000);
  await page.getByTestId('biz-0-inventory').check();
  await money(page, 'biz-0-inv-begin', 2000);
  await money(page, 'biz-0-purchases', 6000);
  await money(page, 'biz-0-inv-end', 1500);
  for (const [k, v] of [['advertising', 1200], ['insurance', 1200], ['legalProfessional', 900], ['officeExpense', 1500], ['supplies', 800], ['travel', 800], ['mealsTotal', 1000], ['utilities', 1100]] as const)
    await money(page, `biz-0-${k}`, v);
  await expect(page.getByTestId('biz-0-profit')).toContainText('$57,500');
  await shot(page, '06-schedule-c');
  await page.getByTestId('continue').click();

  // Schedule A
  await money(page, 'medical', 4000);
  await money(page, 'salt-income', 9500);
  await money(page, 'salt-property', 7800);
  await money(page, 'mortgage', 14200);
  await money(page, 'charity-cash', 3000);
  await money(page, 'charity-noncash', 500);
  await expect(page.getByTestId('deduction-choice')).toContainText('itemized');
  await shot(page, '07-deductions');
  await page.getByTestId('continue').click();

  // Payments
  await money(page, 'estimated', 6000);
  await shot(page, '08-payments');
  await page.getByTestId('continue').click();

  // Review
  await expect(page.getByTestId('review-hero')).toContainText('Amount owed $1,865');
  await expect(page.getByTestId('meter-amount')).toHaveText('$1,865');
  const expected: [string, string][] = [
    ['1a', '$98,000'], ['2b', '$1,850'], ['3a', '$1,900'], ['3b', '$2,400'], ['7a', '$300'], ['8', '$57,500'], ['9', '$160,050'],
    ['10', '$4,063'], ['11b', '$155,987'], ['12e', '$35,000'], ['13a', '$10,687'], ['15', '$110,300'], ['16', '$13,940'],
    ['19', '$4,400'], ['23', '$8,125'], ['24', '$17,665'], ['33', '$15,800'], ['37', '$1,865'],
  ];
  for (const [line, v] of expected) await expect(lineValue(page, 'f1040', line), `1040 line ${line}`).toHaveText(v);
  await expect(lineValue(page, 'schA', '17')).toHaveText('$35,000');
  await expect(lineValue(page, 'schB', '4')).toHaveText('$1,850');
  await expect(lineValue(page, 'schC', '31')).toHaveText('$57,500');
  await expect(lineValue(page, 'schSE', '12')).toHaveText('$8,125');
  await shot(page, '09-review');

  // Persistence: reload keeps everything (localStorage)
  await page.reload();
  await expect(page.getByTestId('meter-amount')).toHaveText('$1,865');

  // Print-friendly summary
  await page.goto('/print');
  await expect(page.getByTestId('print-page')).toContainText('Alex Rivera & Jordan');
  await expect(lineValue(page, 'f1040', '37')).toHaveText('$1,865');
  await page.emulateMedia({ media: 'print' });
  await shot(page, '10-print-summary');
  await page.pdf({ path: 'artifacts/10-print-summary.pdf', format: 'Letter', printBackground: true });

});

test('no requests leave localhost while filling a return', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['localhost', '127.0.0.1'].includes(u.hostname) && u.protocol.startsWith('http')) external.push(r.url());
  });
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await acceptDisclaimer(page);
  await page.getByTestId('load-sample').click();
  await expect(page.getByTestId('review-hero')).toContainText('$1,865');
  await page.goto('/print');
  await expect(page.getByTestId('print-page')).toBeVisible();
  await page.goto('/rules');
  await expect(page.getByTestId('rules-page')).toBeVisible();
  expect(external).toEqual([]);
});

test('Rules & Why is searchable and filterable', async ({ page }) => {
  await page.goto('/rules');
  await expect(page.getByTestId('rules-page')).toBeVisible();
  await expect(page.getByTestId('rules-count')).toContainText('rules');
  await expect(page.getByTestId('rules-unverified-banner')).toHaveCount(0);
  await expect(page.getByTestId('rules-unverified')).toHaveCount(0);
  await page.getByTestId('rules-search').fill('SALT');
  await expect(page.getByTestId('rule-salt-cap')).toBeVisible();
  await page.getByTestId('rules-class').selectOption('annual');
  await expect(page.getByTestId('rule-salt-cap')).toBeVisible();
  await page.getByTestId('rules-simp').check();
  await expect(page.getByTestId('rules-count')).toContainText('of');
  await page.getByTestId('rules-simp').uncheck();
  await page.getByTestId('rules-search').fill('');
  await page.getByTestId('rules-class').selectOption('all');
  await expect(page.getByTestId('rule-odc')).toBeVisible();
  await expect(page.getByTestId('rule-roth-phaseout')).toBeVisible();
  await expect(page.getByTestId('rule-kiddie-tax')).toContainText('$2,700');
});
