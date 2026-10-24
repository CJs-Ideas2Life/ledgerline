import { blankBusiness, blankReturn, completeAdult, type Person, type TaxReturnInput, type W2 } from '../../src/engine';

export function w2(wages: number, withholding = 0, owner: 'taxpayer' | 'spouse' = 'taxpayer', extra: Partial<W2> = {}): W2 {
  const ss = Math.min(wages, 176_100);
  return {
    id: `w2-${Math.random()}`, employer: 'Employer', owner, wages, federalWithholding: withholding,
    socialSecurityWages: ss, socialSecurityTax: Math.round(ss * 0.062), medicareWages: wages,
    medicareTax: Math.round(wages * 0.0145 + Math.max(0, wages - 200_000) * 0.009),
    qualifiedTips: 0, qualifiedOvertime: 0, ...extra,
  };
}

/** Completed-interview helper used by existing unit tests. */
export function ret(over: Partial<TaxReturnInput> = {}): TaxReturnInput {
  const b = blankReturn();
  return {
    ...b,
    canBeClaimedAsDependent: false,
    spouseItemizes: false,
    mfsLivedApart: false,
    ...over,
    taxpayer: { ...completeAdult(), ...(over.taxpayer ?? {}) },
    spouse: { ...completeAdult(), ...(over.spouse ?? {}) },
    itemized: { ...b.itemized, ...(over.itemized ?? {}) },
  };
}

/** Unanswered interview — eligibility is not established. */
export function unansweredRet(over: Partial<TaxReturnInput> = {}): TaxReturnInput {
  return { ...blankReturn(), ...over };
}

export function biz(gross: number, expenses = 0, owner: 'taxpayer' | 'spouse' = 'taxpayer') {
  const b = blankBusiness();
  b.name = 'Biz';
  b.owner = owner;
  b.grossReceipts = gross;
  b.expenses.otherExpenses = expenses;
  return b;
}

export const kid = (i: number, under17 = true, ssn = true, eic = under17) => ({
  id: `k${i}`, firstName: `Kid${i}`, relationship: 'Child',
  dateOfBirth: under17 ? '2015-06-01' : '2005-06-01',
  ageAtYearEnd: under17 ? 10 : 20,
  under17, hasValidSSN: ssn, eicQualifying: eic,
  isStudent: false, isPermanentlyDisabled: false, livedWithTaxpayerMoreThanHalfYear: true,
});

export const adult = (over: Partial<Person> = {}) => completeAdult(over);
