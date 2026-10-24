import { describe, expect, it } from 'vitest';
import {
  blankDependent, blankReturn, completeAdult, computeReturn, creditEligibility, dependentEicQualifying, dependentUnder17, is25To64, is65OrOver,
} from '../../src/engine';
import { kid, ret, unansweredRet, w2 } from './helpers';

describe('household eligibility starts unanswered', () => {
  it('blankReturn does not establish SSN, age, or dependency', () => {
    const b = blankReturn();
    expect(b.taxpayer.hasValidSSN).toBeNull();
    expect(b.taxpayer.ageAtYearEnd).toBeNull();
    expect(b.taxpayer.dateOfBirth).toBe('');
    expect(b.canBeClaimedAsDependent).toBeNull();
    expect(blankDependent().under17).toBeNull();
    expect(blankDependent().hasValidSSN).toBeNull();
    expect(blankDependent().eicQualifying).toBeNull();
  });

  it('bare $8,000 W-2 with unanswered facts does not award EIC 614 or a complete refund', () => {
    const r = computeReturn(unansweredRet({
      w2s: [w2(8_000)],
    }));
    expect(r.form1040['27a']).toBe(0);
    expect(r.form1040['35a']).toBe(0);
    expect(r.scope.status).toBe('incomplete');
    expect(r.scope.missingFacts.length).toBeGreaterThan(0);
    expect(r.scope.previews.some((p) => p.id === 'wages' && p.amount === 8_000)).toBe(true);
    expect(r.warnings.some((w) => w.message.includes('not a complete result'))).toBe(true);
  });

  it('preserves explicit No and explicit zero', () => {
    const r = computeReturn(ret({
      taxpayer: completeAdult({ hasValidSSN: false }),
      canBeClaimedAsDependent: false,
      w2s: [w2(8_000)],
    }));
    expect(r.form1040['27a']).toBe(0);
    expect(r.scope.missingFacts).toEqual([]);
    expect(r.scope.status).toBe('complete');
  });
});

describe('age breakpoints 17 / 24 / 25 / 64 / 65', () => {
  it('child age 17 is not CTC; age 16 is', () => {
    expect(dependentUnder17({ ...blankDependent(), ageAtYearEnd: 16, dateOfBirth: '' })).toBe(true);
    expect(dependentUnder17({ ...blankDependent(), ageAtYearEnd: 17, dateOfBirth: '' })).toBe(false);
  });

  it('EIC qualifying child: 18 yes, 19 needs student, 24 no unless disabled', () => {
    const base = { ...blankDependent(), livedWithTaxpayerMoreThanHalfYear: true as const, dateOfBirth: '', eicQualifying: null };
    expect(dependentEicQualifying({ ...base, ageAtYearEnd: 18 })).toBe(true);
    expect(dependentEicQualifying({ ...base, ageAtYearEnd: 19, isStudent: true })).toBe(true);
    expect(dependentEicQualifying({ ...base, ageAtYearEnd: 19, isStudent: false, isPermanentlyDisabled: false })).toBe(false);
    expect(dependentEicQualifying({ ...base, ageAtYearEnd: 24, isStudent: true, isPermanentlyDisabled: false })).toBe(false);
    expect(dependentEicQualifying({ ...base, ageAtYearEnd: 24, isPermanentlyDisabled: true })).toBe(true);
  });

  it('childless EIC age: 24 no, 25 yes, 64 yes, 65 no', () => {
    expect(is25To64(completeAdult({ ageAtYearEnd: 24, dateOfBirth: '' }))).toBe(false);
    expect(is25To64(completeAdult({ ageAtYearEnd: 25, dateOfBirth: '' }))).toBe(true);
    expect(is25To64(completeAdult({ ageAtYearEnd: 64, dateOfBirth: '' }))).toBe(true);
    expect(is25To64(completeAdult({ ageAtYearEnd: 65, dateOfBirth: '' }))).toBe(false);
    expect(is65OrOver(completeAdult({ ageAtYearEnd: 65, dateOfBirth: '' }))).toBe(true);
  });

  it('date of birth 1960-01-01 is 65 at year-end 2025', () => {
    expect(is65OrOver(completeAdult({ dateOfBirth: '1960-01-01', ageAtYearEnd: null, bornBefore1961: null }))).toBe(true);
    expect(is65OrOver(completeAdult({ dateOfBirth: '1961-01-01', ageAtYearEnd: null, bornBefore1961: null }))).toBe(true);
    expect(is65OrOver(completeAdult({ dateOfBirth: '1961-01-02', ageAtYearEnd: null, bornBefore1961: null }))).toBe(false);
  });
});

describe('SSN unknown / false / true', () => {
  it('unknown taxpayer SSN gates EIC and CTC', () => {
    const r = computeReturn(ret({
      taxpayer: completeAdult({ hasValidSSN: null }),
      w2s: [w2(20_000)],
      dependents: [kid(1)],
    }));
    expect(r.form1040['27a']).toBe(0);
    expect(r.form1040['19']).toBe(0);
    expect(r.scope.status).toBe('incomplete');
  });

  it('confirmed false taxpayer SSN: no EIC, children fall to ODC', () => {
    const r = computeReturn(ret({
      filingStatus: 'hoh',
      taxpayer: completeAdult({ hasValidSSN: false }),
      w2s: [w2(60_000)],
      dependents: [kid(1)],
    }));
    expect(r.form1040['27a']).toBe(0);
    expect(r.schedule8812['5']).toBe(0);
    expect(r.schedule8812['7']).toBe(500);
    expect(r.scope.status).toBe('complete');
  });

  it('confirmed true SSN allows credits when other facts are answered', () => {
    const r = computeReturn(ret({
      filingStatus: 'hoh',
      w2s: [w2(12_730)],
      dependents: [kid(1)],
    }));
    expect(r.form1040['27a']).toBe(4_328);
    expect(r.scope.status).toBe('complete');
  });
});

describe('new dependents and branch changes', () => {
  it('a newly added dependent starts unanswered and does not create CTC/EIC', () => {
    const r = computeReturn(ret({
      filingStatus: 'hoh',
      w2s: [w2(20_000)],
      dependents: [blankDependent()],
    }));
    expect(r.form1040['27a']).toBe(0);
    expect(r.schedule8812['5']).toBe(0);
    expect(r.scope.status).toBe('incomplete');
    expect(creditEligibility(ret({ dependents: [blankDependent()] })).missing.length).toBeGreaterThan(0);
  });

  it('switching a child to confirmed not-under-17 drops CTC and uses ODC', () => {
    const r = computeReturn(ret({
      filingStatus: 'hoh',
      w2s: [w2(60_000)],
      dependents: [kid(1, false, true, true)],
    }));
    expect(r.schedule8812['5']).toBe(0);
    expect(r.schedule8812['7']).toBe(500);
  });
});
