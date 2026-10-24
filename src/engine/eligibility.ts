// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Dependent, Person, TaxReturnInput } from './types';

const TAX_YEAR = 2025;

/** Age on December 31 of `taxYear` from an ISO date (YYYY-MM-DD). */
export function ageFromDob(dob: string, taxYear = TAX_YEAR): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((dob ?? '').trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < 1900 || y > taxYear || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return taxYear - y;
}

export function yearEndAge(p: { dateOfBirth?: string; ageAtYearEnd?: number | null }, taxYear = TAX_YEAR): number | null {
  if (p.ageAtYearEnd != null && Number.isFinite(p.ageAtYearEnd) && p.ageAtYearEnd >= 0 && p.ageAtYearEnd < 130) {
    return Math.floor(p.ageAtYearEnd);
  }
  return ageFromDob(p.dateOfBirth ?? '', taxYear);
}

/** Age 65+ for 2025 ≡ born before January 2, 1961 (Form 1040). */
export function is65OrOver(p: Person, taxYear = TAX_YEAR): boolean | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((p.dateOfBirth ?? '').trim());
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const cutoffY = taxYear - 64;
    if (y < cutoffY) return true;
    if (y > cutoffY) return false;
    return mo === 1 ? d < 2 : false;
  }
  const age = yearEndAge(p, taxYear);
  if (age != null) return age >= 65;
  return p.bornBefore1961;
}

export function is50OrOver(p: Person, taxYear = TAX_YEAR): boolean | null {
  const age = yearEndAge(p, taxYear);
  if (age != null) return age >= 50;
  return p.age50OrOver;
}

/** Childless EIC: at least 25 and under 65. Unanswered if we cannot prove both bounds. */
export function is25To64(p: Person, taxYear = TAX_YEAR): boolean | null {
  const over65 = is65OrOver(p, taxYear);
  if (over65 === true) return false;
  const age = yearEndAge(p, taxYear);
  if (age != null) return age >= 25 && over65 === false;
  if (p.bornBefore1961 === true) return false;
  return null;
}

export function dependentUnder17(d: Dependent, taxYear = TAX_YEAR): boolean | null {
  if (d.under17 != null) return d.under17;
  const age = yearEndAge(d, taxYear);
  if (age != null) return age < 17;
  return null;
}

/**
 * EIC qualifying child: explicit flag, or age &lt; 19, or age &lt; 24 and a student,
 * or permanently and totally disabled. Residency must not be a confirmed no.
 */
export function dependentEicQualifying(d: Dependent, taxYear = TAX_YEAR): boolean | null {
  // An explicit qualifying-child answer is the completed interview fact.
  if (d.eicQualifying != null) return d.eicQualifying;
  if (d.livedWithTaxpayerMoreThanHalfYear === false) return false;
  if (d.livedWithTaxpayerMoreThanHalfYear == null) return null;
  const age = yearEndAge(d, taxYear);
  if (age == null) return null;
  if (d.isPermanentlyDisabled === true) return true;
  if (age < 19) return true;
  if (age < 24) {
    if (d.isStudent === true) return true;
    if (d.isStudent === false && d.isPermanentlyDisabled === false) return false;
    return null;
  }
  if (d.isPermanentlyDisabled === false) return false;
  return null;
}

export function answeredTrue(v: boolean | null | undefined): boolean {
  return v === true;
}

export function ssnValid(p: { hasValidSSN?: boolean | null }): boolean | null {
  if (p.hasValidSSN === true) return true;
  if (p.hasValidSSN === false) return false;
  return null;
}

export function taxpayerSsnForCredits(input: TaxReturnInput): boolean | null {
  const tp = ssnValid(input.taxpayer);
  if (input.filingStatus !== 'mfj') return tp;
  const sp = ssnValid(input.spouse);
  if (tp === true || sp === true) return true;
  if (tp === false && sp === false) return false;
  return null;
}

export interface CreditEligibility {
  eicChildren: number;
  ctcChildren: number;
  odcDependents: number;
  eicTaxpayerOk: boolean | null;
  ctcTaxpayerOk: boolean | null;
  eicChildlessAgeOk: boolean | null;
  missing: string[];
}

export function creditEligibility(input: TaxReturnInput, taxYear = TAX_YEAR): CreditEligibility {
  const missing: string[] = [];
  const fs = input.filingStatus;
  const joint = fs === 'mfj';

  const tpSsn = ssnValid(input.taxpayer);
  const spSsn = joint ? ssnValid(input.spouse) : true;
  if (tpSsn == null) missing.push('Taxpayer SSN valid for employment is unanswered.');
  if (joint && spSsn == null) missing.push('Spouse SSN valid for employment is unanswered.');

  if (input.canBeClaimedAsDependent == null) missing.push('Whether someone else can claim you as a dependent is unanswered.');
  if (fs === 'mfs' && input.mfsLivedApart == null) missing.push('Whether you lived apart from your spouse for the last 6 months is unanswered.');

  const tpAgeOk = is25To64(input.taxpayer, taxYear);
  const spAgeOk = joint ? is25To64(input.spouse, taxYear) : true;
  if (tpAgeOk == null && yearEndAge(input.taxpayer, taxYear) == null && input.taxpayer.bornBefore1961 == null) {
    missing.push('Your age or date of birth is unanswered (needed for childless EIC and the 65+ deduction).');
  }
  if (joint && spAgeOk == null && yearEndAge(input.spouse, taxYear) == null && input.spouse.bornBefore1961 == null) {
    missing.push("Spouse's age or date of birth is unanswered.");
  }

  let eicChildren = 0;
  let ctcChildren = 0;
  let odcDependents = 0;
  input.dependents.forEach((d, i) => {
    const label = d.firstName || `Dependent ${i + 1}`;
    const under17 = dependentUnder17(d, taxYear);
    const eic = dependentEicQualifying(d, taxYear);
    const ssn = ssnValid(d);
    if (under17 == null) missing.push(`${label}: age / under-17 at year-end 2025 is unanswered.`);
    if (eic == null) missing.push(`${label}: EIC-qualifying-child facts are unanswered.`);
    if (ssn == null) missing.push(`${label}: SSN valid for employment is unanswered.`);
    if (eic === true && ssn === true) eicChildren += 1;
    if (under17 === true && ssn === true) ctcChildren += 1;
    else if (under17 !== null && !(under17 === true && ssn == null)) {
      if (under17 === false || ssn === false) odcDependents += 1;
    }
  });

  const eicTaxpayerOk = tpSsn === true && (joint ? spSsn === true : true);
  const ctcTaxpayerOk = taxpayerSsnForCredits(input);
  const eicChildlessAgeOk = eicChildren > 0
    ? true
    : tpAgeOk === true && (joint ? spAgeOk === true : true);

  return {
    eicChildren: Math.min(3, eicChildren),
    ctcChildren,
    odcDependents,
    eicTaxpayerOk: eicTaxpayerOk ? true : (tpSsn == null || (joint && spSsn == null) ? null : false),
    ctcTaxpayerOk,
    eicChildlessAgeOk,
    missing,
  };
}
