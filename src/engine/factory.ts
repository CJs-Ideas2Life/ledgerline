// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Business, CapitalGainTrade, DividendItem, InterestItem, Person, TaxReturnInput, W2, Dependent } from './types';

let n = 0;
export const newId = (p: string) => `${p}-${Date.now().toString(36)}-${(n++).toString(36)}`;

/** Live interview defaults: eligibility starts unanswered, not established. */
export const blankPerson = (): Person => ({
  firstName: '', lastName: '', dateOfBirth: '', ageAtYearEnd: null,
  bornBefore1961: null, age50OrOver: null, blind: null, hasValidSSN: null,
});

/** Completed-adult defaults for unit tests and the sample household. */
export const completeAdult = (over: Partial<Person> = {}): Person => ({
  firstName: '', lastName: '', dateOfBirth: '1990-06-15', ageAtYearEnd: 35,
  bornBefore1961: false, age50OrOver: false, blind: false, hasValidSSN: true, ...over,
});

/** Historical test-pack defaults when a fixture omits eligibility fields. */
export const packPerson = (): Person => completeAdult({ dateOfBirth: '', ageAtYearEnd: 35 });

export const blankW2 = (): W2 => ({
  id: newId('w2'), employer: '', owner: 'taxpayer', wages: 0, federalWithholding: 0,
  socialSecurityWages: 0, socialSecurityTax: 0, medicareWages: 0, medicareTax: 0,
  qualifiedTips: 0, qualifiedOvertime: 0,
});

export const blankInterest = (): InterestItem => ({ id: newId('int'), payer: '', taxable: 0, taxExempt: 0, federalWithholding: 0 });
export const blankDividend = (): DividendItem => ({ id: newId('div'), payer: '', ordinary: 0, qualified: 0, capitalGainDistributions: 0, federalWithholding: 0 });
export const blankDependent = (): Dependent => ({
  id: newId('dep'), firstName: '', relationship: 'Child', dateOfBirth: '', ageAtYearEnd: null,
  under17: null, hasValidSSN: null, eicQualifying: null,
  isStudent: null, isPermanentlyDisabled: null, livedWithTaxpayerMoreThanHalfYear: null,
});

export const packDependent = (): Dependent => ({
  id: newId('dep'), firstName: '', relationship: 'Child', dateOfBirth: '', ageAtYearEnd: 10,
  under17: true, hasValidSSN: true, eicQualifying: true,
  isStudent: false, isPermanentlyDisabled: false, livedWithTaxpayerMoreThanHalfYear: true,
});
export const blankTrade = (): CapitalGainTrade => ({
  id: newId('cg'), description: '', dateAcquired: '', dateSold: '', proceeds: 0, cost: 0,
  term: 'auto', collectible: false, unrecaptured1250: false,
});

export const blankBusiness = (): Business => ({
  id: newId('biz'), name: '', owner: 'taxpayer', grossReceipts: 0, returnsAllowances: 0, hasInventory: false,
  cogs: { beginningInventory: 0, purchases: 0, costOfLabor: 0, materialsSupplies: 0, otherCosts: 0, endingInventory: 0 },
  otherIncome: 0,
  expenses: {
    advertising: 0, carTruck: 0, commissionsFees: 0, contractLabor: 0, depletion: 0, depreciation: 0, employeeBenefits: 0,
    insurance: 0, mortgageInterest: 0, otherInterest: 0, legalProfessional: 0, officeExpense: 0, pensionProfitSharing: 0,
    rentVehicles: 0, rentOther: 0, repairs: 0, supplies: 0, taxesLicenses: 0, travel: 0, mealsTotal: 0, utilities: 0,
    wages: 0, otherExpenses: 0,
  },
  homeOffice: 0, isSstb: false, ubia: 0, qualifiedTips: 0,
  seHealthInsurance: 0, sepOrSoloEmployer: 0, solo401kElective: 0,
});

export const blankReturn = (): TaxReturnInput => ({
  taxYear: 2025,
  filingStatus: 'single',
  taxpayer: blankPerson(),
  spouse: blankPerson(),
  canBeClaimedAsDependent: null,
  spouseItemizes: null,
  mfsLivedApart: null,
  dependents: [],
  w2s: [],
  interest: [],
  dividends: [],
  foreignAccount: false,
  foreignTrust: false,
  businesses: [],
  capitalGains: [],
  stLossCarryover: 0,
  ltLossCarryover: 0,
  itemized: {
    medical: 0, stateLocalIncomeOrSalesTax: 0, useSalesTax: false, realEstateTax: 0, personalPropertyTax: 0, otherTaxes: 0,
    mortgageInterest1098: 0, mortgageInterestNo1098: 0, pointsNo1098: 0, investmentInterest: 0,
    charityCash: 0, charityNonCash: 0, charityCarryover: 0, casualtyLoss: 0, otherItemized: 0,
    mortgageAverageBalance: 0, investmentInterestCarryover: 0,
  },
  forceItemize: false,
  qbiLossCarryforward: 0,
  estimatedPayments: 0,
  carLoanInterest: 0,
  coveredByEmployerHealthPlan: false,
  priorYearTax: 0,
  priorYearAgi: 0,
});

/** A fictional sample household used by the demo button, the e2e test and unit tests. */
export function sampleReturn(): TaxReturnInput {
  const r = blankReturn();
  r.filingStatus = 'mfj';
  r.canBeClaimedAsDependent = false;
  r.spouseItemizes = false;
  r.mfsLivedApart = false;
  r.taxpayer = completeAdult({ firstName: 'Alex', lastName: 'Rivera' });
  r.spouse = completeAdult({ firstName: 'Jordan', lastName: 'Rivera' });
  r.dependents = [
    { id: 'dep-1', firstName: 'Sam', relationship: 'Son', dateOfBirth: '2015-04-12', ageAtYearEnd: 10, under17: true, hasValidSSN: true, eicQualifying: true, isStudent: false, isPermanentlyDisabled: false, livedWithTaxpayerMoreThanHalfYear: true },
    { id: 'dep-2', firstName: 'Riley', relationship: 'Daughter', dateOfBirth: '2018-09-03', ageAtYearEnd: 7, under17: true, hasValidSSN: true, eicQualifying: true, isStudent: false, isPermanentlyDisabled: false, livedWithTaxpayerMoreThanHalfYear: true },
  ];
  r.w2s = [
    { id: 'w2-1', employer: 'Northwind Logistics', owner: 'taxpayer', wages: 98_000, federalWithholding: 9_800,
      socialSecurityWages: 98_000, socialSecurityTax: 6_076, medicareWages: 98_000, medicareTax: 1_421,
      qualifiedTips: 0, qualifiedOvertime: 0 },
  ];
  r.interest = [
    { id: 'int-1', payer: 'Prairie Savings Bank', taxable: 1_850, taxExempt: 0, federalWithholding: 0 },
    { id: 'int-2', payer: 'City Muni Bond Fund', taxable: 0, taxExempt: 400, federalWithholding: 0 },
  ];
  r.dividends = [
    { id: 'div-1', payer: 'Lakeshore Brokerage', ordinary: 2_400, qualified: 1_900, capitalGainDistributions: 300, federalWithholding: 0 },
  ];
  const b = blankBusiness();
  b.id = 'biz-1';
  b.name = 'Rivera Design Studio';
  b.owner = 'spouse';
  b.grossReceipts = 72_000;
  b.hasInventory = true;
  b.cogs = { beginningInventory: 2_000, purchases: 6_000, costOfLabor: 0, materialsSupplies: 0, otherCosts: 0, endingInventory: 1_500 };
  b.expenses = { ...b.expenses, advertising: 1_200, insurance: 1_200, legalProfessional: 900, officeExpense: 1_500,
    supplies: 800, travel: 800, mealsTotal: 1_000, utilities: 1_100 };
  r.businesses = [b];
  r.itemized = { ...r.itemized, medical: 4_000, stateLocalIncomeOrSalesTax: 9_500, realEstateTax: 7_800,
    mortgageInterest1098: 14_200, charityCash: 3_000, charityNonCash: 500 };
  r.estimatedPayments = 6_000;
  return r;
}
