// SPDX-License-Identifier: AGPL-3.0-or-later
import type { FilingStatus } from './constants2025';
import type { TraceStep } from './rules/types';
export type { FilingStatus, TraceStep };

export type Owner = 'taxpayer' | 'spouse';

/** Yes / no / unanswered. Unanswered is not treated as established. */
export type Tri = boolean | null;

export interface Person {
  firstName: string;
  lastName: string;
  /** ISO date YYYY-MM-DD; empty means unanswered. */
  dateOfBirth: string;
  /** Age on December 31, 2025 when no date of birth is given. */
  ageAtYearEnd: number | null;
  /** Born before January 2, 1961 (age 65+ for 2025). Null = unanswered. */
  bornBefore1961: Tri;
  /** Age 50 or older at year-end 2025 (solo 401(k) catch-up). */
  age50OrOver: Tri;
  blind: Tri;
  /** SSN valid for employment (required for CTC, EIC, and the senior / tip / overtime deductions). */
  hasValidSSN: Tri;
}

export interface Dependent {
  id: string;
  firstName: string;
  relationship: string;
  dateOfBirth: string;
  ageAtYearEnd: number | null;
  /** Under age 17 at the end of 2025. Null = unanswered. */
  under17: Tri;
  /** Has an SSN valid for employment issued before the return due date. */
  hasValidSSN: Tri;
  /**
   * Qualifying child for the earned income credit (under 19, or under 24 and a
   * student, or permanently and totally disabled). Independent of the CTC age-17 test.
   */
  eicQualifying: Tri;
  isStudent: Tri;
  isPermanentlyDisabled: Tri;
  livedWithTaxpayerMoreThanHalfYear: Tri;
}

export interface W2 {
  id: string;
  employer: string;
  owner: Owner;
  wages: number; // box 1
  federalWithholding: number; // box 2
  socialSecurityWages: number; // box 3
  socialSecurityTax: number; // box 4
  medicareWages: number; // box 5
  medicareTax: number; // box 6
  /** Qualified tips (W-2 box 7, or the qualified-tip amount determined under Notice 2025-69). */
  qualifiedTips: number;
  /** Qualified overtime compensation — the FLSA premium over the regular rate (Notice 2025-69 / § 225). */
  qualifiedOvertime: number;
}

export interface InterestItem {
  id: string;
  payer: string;
  taxable: number; // 1099-INT box 1 (+ box 3)
  taxExempt: number; // 1099-INT box 8
  federalWithholding: number; // 1099-INT box 4
}

export interface DividendItem {
  id: string;
  payer: string;
  ordinary: number; // 1099-DIV box 1a
  qualified: number; // 1099-DIV box 1b
  capitalGainDistributions: number; // 1099-DIV box 2a
  federalWithholding: number; // 1099-DIV box 4
}

export interface CogsInput {
  beginningInventory: number; // line 35
  purchases: number; // line 36
  costOfLabor: number; // line 37
  materialsSupplies: number; // line 38
  otherCosts: number; // line 39
  endingInventory: number; // line 41
}

export interface ScheduleCExpenses {
  advertising: number; // 8
  carTruck: number; // 9
  commissionsFees: number; // 10
  contractLabor: number; // 11
  depletion: number; // 12
  depreciation: number; // 13
  employeeBenefits: number; // 14
  insurance: number; // 15
  mortgageInterest: number; // 16a
  otherInterest: number; // 16b
  legalProfessional: number; // 17
  officeExpense: number; // 18
  pensionProfitSharing: number; // 19
  rentVehicles: number; // 20a
  rentOther: number; // 20b
  repairs: number; // 21
  supplies: number; // 22
  taxesLicenses: number; // 23
  travel: number; // 24a
  /** Total business meals paid; 50% is deducted on line 24b. */
  mealsTotal: number;
  utilities: number; // 25
  wages: number; // 26
  otherExpenses: number; // 27b (Part V total)
}

export interface Business {
  id: string;
  name: string;
  owner: Owner;
  grossReceipts: number; // 1
  returnsAllowances: number; // 2
  hasInventory: boolean;
  cogs: CogsInput;
  otherIncome: number; // 6
  expenses: ScheduleCExpenses;
  homeOffice: number; // 30
  /** Specified service trade or business (§ 199A(d)(2)) — Form 8995-A Schedule A. */
  isSstb: boolean;
  /** Unadjusted basis immediately after acquisition of qualified property (Form 8995-A). */
  ubia: number;
  /** Qualified tips received in this trade or business (Schedule 1-A line 5). */
  qualifiedTips: number;
  /** Self-employed health insurance premiums paid for this business (Sch. 1 line 17). */
  seHealthInsurance: number;
  /** Requested SEP / solo 401(k) employer contribution (capped by the 20% / $70,000 limit). */
  sepOrSoloEmployer: number;
  /** Requested solo 401(k) elective deferral (capped by $23,500 + $7,500 catch-up). */
  solo401kElective: number;
}

export interface ItemizedInput {
  medical: number; // A1
  stateLocalIncomeOrSalesTax: number; // A5a
  useSalesTax: boolean;
  realEstateTax: number; // A5b
  personalPropertyTax: number; // A5c
  otherTaxes: number; // A6
  mortgageInterest1098: number; // A8a
  mortgageInterestNo1098: number; // A8b
  pointsNo1098: number; // A8c
  investmentInterest: number; // A9
  charityCash: number; // A11
  charityNonCash: number; // A12
  charityCarryover: number; // A13
  casualtyLoss: number; // A15
  otherItemized: number; // A16
  /**
   * Average acquisition-debt balance for the $750,000 ($375,000 MFS) limit (Pub. 936).
   * Leave 0 to take mortgage interest as entered (already-limited).
   */
  mortgageAverageBalance: number;
  /** Prior-year disallowed investment interest (Form 4952 line 2). */
  investmentInterestCarryover: number;
}

export interface CapitalGainTrade {
  id: string;
  description: string;
  dateAcquired: string;
  dateSold: string;
  proceeds: number;
  cost: number;
  /** Leave 'auto' to classify from the dates (more than one year = long-term). */
  term: 'short' | 'long' | 'auto';
  collectible: boolean;
  unrecaptured1250: boolean;
}

export interface TaxReturnInput {
  taxYear: 2025;
  filingStatus: FilingStatus;
  taxpayer: Person;
  spouse: Person;
  /** Someone can claim the taxpayer (or spouse) as a dependent (line 12a). Null = unanswered. */
  canBeClaimedAsDependent: Tri;
  /** MFS only: spouse itemizes on a separate return (line 12b) — standard deduction is zero. */
  spouseItemizes: Tri;
  /**
   * MFS only: lived apart from the spouse for the last 6 months of 2025
   * (EIC separated-spouse exception, § 32(d)).
   */
  mfsLivedApart: Tri;
  dependents: Dependent[];
  w2s: W2[];
  interest: InterestItem[];
  dividends: DividendItem[];
  /** Schedule B Part III answers. */
  foreignAccount: boolean;
  foreignTrust: boolean;
  businesses: Business[];
  capitalGains: CapitalGainTrade[];
  /** Prior-year short-term capital loss carryover (positive number). */
  stLossCarryover: number;
  /** Prior-year long-term capital loss carryover (positive number). */
  ltLossCarryover: number;
  itemized: ItemizedInput;
  /** Elect to itemize even if less than the standard deduction (Sch. A line 18). */
  forceItemize: boolean;
  qbiLossCarryforward: number; // positive number = prior-year loss carryforward
  estimatedPayments: number; // line 26
  /** Qualified passenger-vehicle loan interest paid in 2025 (Schedule 1-A Part IV). */
  carLoanInterest: number;
  /** Eligible for employer-sponsored health coverage (blocks the SE health-insurance deduction). */
  coveredByEmployerHealthPlan: boolean;
  /** 2024 total tax (Form 2210 line 8) — leave 0 to use the 90% current-year safe harbor only. */
  priorYearTax: number;
  /** 2024 AGI, used only to choose 100% vs 110% of prior-year tax. */
  priorYearAgi: number;
}

export type Lines = Record<string, number>;

export interface Warning {
  level: 'info' | 'warn' | 'unsupported';
  message: string;
}

export interface ScheduleCResult {
  id: string;
  name: string;
  owner: Owner;
  lines: Lines;
}

export interface ScheduleSEResult {
  owner: Owner;
  lines: Lines;
}

export interface Form8949Result {
  id: string;
  description: string;
  term: 'short' | 'long';
  proceeds: number;
  cost: number;
  gain: number;
  collectible: boolean;
  unrecaptured1250: boolean;
}

export type ReturnClaim = 'complete' | 'incomplete' | 'blocked' | 'invalid';

export interface ComponentPreview {
  id: string;
  label: string;
  amount: number;
  note: string;
}

export interface ReturnScope {
  status: ReturnClaim;
  missingFacts: string[];
  invalidFacts: string[];
  unsupportedFacts: string[];
  previews: ComponentPreview[];
}

export interface TaxResult {
  form1040: Lines;
  schedule1: Lines;
  schedule1A: Lines;
  schedule2: Lines;
  schedule3: Lines;
  scheduleA: Lines;
  saltWorksheet: Lines | null;
  scheduleB: Lines;
  scheduleC: ScheduleCResult[];
  scheduleSE: ScheduleSEResult[];
  scheduleD: Lines;
  form8949: Form8949Result[];
  schedule8812: Lines;
  form8995: Lines;
  form8995A: Lines | null;
  form6251: Lines;
  form4952: Lines;
  form2210: Lines;
  form8959: Lines;
  form8960: Lines;
  qdcgWorksheet: Lines | null;
  standardDeduction: number;
  itemizedDeduction: number;
  usesItemized: boolean;
  taxMethod: 'table' | 'computation-worksheet' | 'qdcg-worksheet';
  refund: number;
  amountOwed: number;
  effectiveRate: number;
  marginalRate: number;
  charityCarryoverToNextYear: number;
  investmentInterestCarryoverToNextYear: number;
  capitalLossCarryoverToNextYear: { st: number; lt: number };
  warnings: Warning[];
  /** Every material line linked to one or more Rules & Why registry ids. */
  trace: TraceStep[];
  /** Whole-return claim status. Refund/owed totals are a complete result only when status is `complete`. */
  scope: ReturnScope;
}
