// SPDX-License-Identifier: AGPL-3.0-or-later
import { creditEligibility } from './eligibility';
import { parseMoneyInput } from './money';
import type { ComponentPreview, ReturnScope, TaxReturnInput, Warning } from './types';

const MONEY_FIELDS: { path: string; allowNegative?: boolean }[] = [
  { path: 'estimatedPayments' },
  { path: 'carLoanInterest' },
  { path: 'priorYearTax' },
  { path: 'priorYearAgi' },
  { path: 'qbiLossCarryforward' },
  { path: 'stLossCarryover' },
  { path: 'ltLossCarryover' },
];

const W2_MONEY = ['wages', 'federalWithholding', 'socialSecurityWages', 'socialSecurityTax', 'medicareWages', 'medicareTax', 'qualifiedTips', 'qualifiedOvertime'] as const;
const INT_MONEY = ['taxable', 'taxExempt', 'federalWithholding'] as const;
const DIV_MONEY = ['ordinary', 'qualified', 'capitalGainDistributions', 'federalWithholding'] as const;
const TRADE_MONEY = ['proceeds', 'cost'] as const;
const ITEMIZED_MONEY = [
  'medical', 'stateLocalIncomeOrSalesTax', 'realEstateTax', 'personalPropertyTax', 'otherTaxes',
  'mortgageInterest1098', 'mortgageInterestNo1098', 'pointsNo1098', 'investmentInterest',
  'charityCash', 'charityNonCash', 'charityCarryover', 'casualtyLoss', 'otherItemized',
  'mortgageAverageBalance', 'investmentInterestCarryover',
] as const;
const COGS_MONEY = ['beginningInventory', 'purchases', 'costOfLabor', 'materialsSupplies', 'otherCosts', 'endingInventory'] as const;
const BIZ_MONEY = ['grossReceipts', 'returnsAllowances', 'otherIncome', 'homeOffice', 'ubia', 'qualifiedTips', 'seHealthInsurance', 'sepOrSoloEmployer', 'solo401kElective'] as const;
const EXPENSE_MONEY = [
  'advertising', 'carTruck', 'commissionsFees', 'contractLabor', 'depletion', 'depreciation', 'employeeBenefits',
  'insurance', 'mortgageInterest', 'otherInterest', 'legalProfessional', 'officeExpense', 'pensionProfitSharing',
  'rentVehicles', 'rentOther', 'repairs', 'supplies', 'taxesLicenses', 'travel', 'mealsTotal', 'utilities',
  'wages', 'otherExpenses',
] as const;

function get(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const p of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function check(raw: unknown, label: string, allowNegative = false): string | null {
  const parsed = parseMoneyInput(raw, { allowNegative });
  return parsed.ok ? null : `${label}: ${parsed.error}`;
}

export function validateMoneyFields(input: TaxReturnInput): string[] {
  const errors: string[] = [];
  const push = (e: string | null) => { if (e) errors.push(e); };

  for (const { path, allowNegative } of MONEY_FIELDS) {
    push(check(get(input, path), path, allowNegative));
  }
  input.w2s.forEach((w, i) => {
    W2_MONEY.forEach((k) => push(check(w[k], `W-2 ${i + 1} ${k}`)));
  });
  input.interest.forEach((it, i) => {
    INT_MONEY.forEach((k) => push(check(it[k], `Interest ${i + 1} ${k}`)));
  });
  input.dividends.forEach((d, i) => {
    DIV_MONEY.forEach((k) => push(check(d[k], `Dividend ${i + 1} ${k}`)));
  });
  input.capitalGains.forEach((t, i) => {
    TRADE_MONEY.forEach((k) => push(check(t[k], `Sale ${i + 1} ${k}`)));
  });
  ITEMIZED_MONEY.forEach((k) => push(check(input.itemized[k], `Itemized ${k}`)));
  input.businesses.forEach((b, i) => {
    BIZ_MONEY.forEach((k) => push(check(b[k], `Business ${i + 1} ${k}`)));
    COGS_MONEY.forEach((k) => push(check(b.cogs[k], `Business ${i + 1} COGS ${k}`)));
    EXPENSE_MONEY.forEach((k) => push(check(b.expenses[k], `Business ${i + 1} ${k}`)));
  });
  return errors;
}

export function validateSavedInput(input: unknown): { ok: true; data: TaxReturnInput } | { ok: false; errors: string[] } {
  if (!input || typeof input !== 'object') return { ok: false, errors: ['Saved return is not an object.'] };
  const rec = input as Record<string, unknown>;
  const errors: string[] = [];
  if (rec.taxYear != null && rec.taxYear !== 2025) {
    errors.push(`This file is tax year ${String(rec.taxYear)}. Ledgerline does not relabel another year as 2025.`);
  }
  const filing = rec.filingStatus;
  if (filing != null && !['single', 'mfj', 'mfs', 'hoh', 'qss'].includes(String(filing))) {
    errors.push(`Unsupported filing status: ${String(filing)}.`);
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, data: input as TaxReturnInput };
}

export function unsupportedFacts(input: TaxReturnInput): string[] {
  const out: string[] = [];
  if (input.capitalGains.some((t) => t.collectible)) {
    out.push('Collectibles (28% rate gain) are declared. Ledgerline does not compute the 28% worksheet.');
  }
  if (input.capitalGains.some((t) => t.unrecaptured1250)) {
    out.push('Unrecaptured § 1250 gain is declared. Ledgerline does not compute the 25% worksheet.');
  }
  if (input.foreignAccount) {
    out.push('A foreign financial account is declared. FBAR / Form 8938 are not prepared.');
  }
  if (input.foreignTrust) {
    out.push('A foreign trust is declared. Form 3520 is not prepared.');
  }
  return out;
}

export function buildScope(
  input: TaxReturnInput,
  warnings: Warning[],
  previews: ComponentPreview[],
): ReturnScope {
  const invalidFacts = validateMoneyFields(input);
  const year = validateSavedInput(input);
  if (!year.ok) invalidFacts.push(...year.errors);
  const unsupported = unsupportedFacts(input);
  const elig = creditEligibility(input);
  const missingFacts = elig.missing;
  const status = invalidFacts.length
    ? 'invalid'
    : unsupported.length
      ? 'blocked'
      : missingFacts.length
        ? 'incomplete'
        : 'complete';
  return { status, missingFacts, invalidFacts, unsupportedFacts: unsupported, previews };
}

/** Credits and whole-return refund/owed claims are only “complete” when scope is complete. */
export function claimsAreComplete(scope: ReturnScope): boolean {
  return scope.status === 'complete';
}
