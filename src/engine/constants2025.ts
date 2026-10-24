// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Tax year 2025 constants for the Ledgerline engine.
 *
 * Every figure below was checked against an IRS primary source downloaded on
 * 2026-10-22 (copies + SHA-256 in docs/sources/). Each constant cites the
 * source URL and the exact place in it. Figures changed by Public Law 119-21
 * (the "One Big Beautiful Bill Act", OBBBA, signed 2025-07-04) are taken from
 * the FINAL 2025 forms/instructions, which already reflect OBBBA, and are
 * marked [OBBBA].
 */

export type FilingStatus = 'single' | 'mfj' | 'mfs' | 'hoh' | 'qss';

export const SOURCES = {
  revProc2024_40: 'https://www.irs.gov/pub/irs-drop/rp-24-40.pdf',
  form1040: 'https://www.irs.gov/pub/irs-pdf/f1040.pdf',
  i1040: 'https://www.irs.gov/pub/irs-pdf/i1040gi.pdf',
  scheduleA: 'https://www.irs.gov/pub/irs-pdf/f1040sa.pdf',
  scheduleAInstr: 'https://www.irs.gov/pub/irs-pdf/i1040sca.pdf',
  scheduleB: 'https://www.irs.gov/pub/irs-pdf/f1040sb.pdf',
  scheduleC: 'https://www.irs.gov/pub/irs-pdf/f1040sc.pdf',
  scheduleCInstr: 'https://www.irs.gov/pub/irs-pdf/i1040sc.pdf',
  scheduleSE: 'https://www.irs.gov/pub/irs-pdf/f1040sse.pdf',
  schedule8812: 'https://www.irs.gov/pub/irs-pdf/f1040s8.pdf',
  schedule8812Instr: 'https://www.irs.gov/pub/irs-pdf/i1040s8.pdf',
  schedule1A: 'https://www.irs.gov/pub/irs-pdf/f1040s1a.pdf',
  form8995: 'https://www.irs.gov/pub/irs-pdf/f8995.pdf',
  form8995Instr: 'https://www.irs.gov/pub/irs-pdf/i8995.pdf',
  form8995A: 'https://www.irs.gov/pub/irs-pdf/f8995a.pdf',
  form8995AInstr: 'https://www.irs.gov/pub/irs-pdf/i8995a.pdf',
  form8959: 'https://www.irs.gov/pub/irs-pdf/f8959.pdf',
  form8960Instr: 'https://www.irs.gov/pub/irs-pdf/i8960.pdf',
  form6251: 'https://www.irs.gov/pub/irs-pdf/f6251.pdf',
  form6251Instr: 'https://www.irs.gov/pub/irs-pdf/i6251.pdf',
  form2210: 'https://www.irs.gov/pub/irs-pdf/f2210.pdf',
  form2210Instr: 'https://www.irs.gov/pub/irs-pdf/i2210.pdf',
  form4952: 'https://www.irs.gov/pub/irs-pdf/f4952.pdf',
  form8949: 'https://www.irs.gov/pub/irs-pdf/f8949.pdf',
  scheduleD: 'https://www.irs.gov/pub/irs-pdf/f1040sd.pdf',
  scheduleDInstr: 'https://www.irs.gov/pub/irs-pdf/i1040sd.pdf',
  notice2024_80: 'https://www.irs.gov/pub/irs-drop/n-24-80.pdf',
  notice2025_69: 'https://www.irs.gov/pub/irs-drop/n-25-69.pdf',
  pub526: 'https://www.irs.gov/publications/p526',
  pub936: 'https://www.irs.gov/publications/p936',
  pub535: 'https://www.irs.gov/publications/p535',
  schedule1ANews:
    'https://www.irs.gov/newsroom/schedule-1-a-additional-deductions-what-to-know-about-the-new-form',
  quarterlyRates: 'https://www.irs.gov/payments/quarterly-interest-rates',
  obbbaWithholding:
    'https://www.irs.gov/forms-pubs/how-to-update-withholding-to-account-for-tax-law-changes-for-2025',
  obbbaStatute: 'https://www.congress.gov/119/plaws/publ21/PLAW-119publ21.htm',
  notice2025_5: 'https://www.irs.gov/pub/irs-drop/n-25-05.pdf',
  form4562Instr: 'https://www.irs.gov/pub/irs-pdf/i4562.pdf',
  form8880: 'https://www.irs.gov/pub/irs-pdf/f8880.pdf',
  form8962Instr: 'https://www.irs.gov/pub/irs-pdf/i8962.pdf',
  form8615Instr: 'https://www.irs.gov/pub/irs-pdf/i8615.pdf',
  irc24: 'https://www.law.cornell.edu/uscode/text/26/24',
  ssaWageBase: 'https://www.ssa.gov/oact/cola/cbb.html',
} as const;

export interface Bracket {
  /** Upper bound of this bracket (Infinity for the top bracket). */
  upTo: number;
  rate: number;
}

/**
 * Ordinary income tax rate schedules, § 1(j)(2).
 * Source: Rev. Proc. 2024-40 § 3.01 Tables 1–4 (SOURCES.revProc2024_40);
 * cross-checked against the 2025 Tax Computation Worksheet, Form 1040
 * instructions p. 80 (SOURCES.i1040). OBBBA made these rates permanent and
 * did not change the 2025 bracket amounts.
 */
export const BRACKETS: Record<FilingStatus, Bracket[]> = {
  single: [
    { upTo: 11_925, rate: 0.1 },
    { upTo: 48_475, rate: 0.12 },
    { upTo: 103_350, rate: 0.22 },
    { upTo: 197_300, rate: 0.24 },
    { upTo: 250_525, rate: 0.32 },
    { upTo: 626_350, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  mfj: [
    { upTo: 23_850, rate: 0.1 },
    { upTo: 96_950, rate: 0.12 },
    { upTo: 206_700, rate: 0.22 },
    { upTo: 394_600, rate: 0.24 },
    { upTo: 501_050, rate: 0.32 },
    { upTo: 751_600, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  qss: [
    { upTo: 23_850, rate: 0.1 },
    { upTo: 96_950, rate: 0.12 },
    { upTo: 206_700, rate: 0.22 },
    { upTo: 394_600, rate: 0.24 },
    { upTo: 501_050, rate: 0.32 },
    { upTo: 751_600, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  mfs: [
    { upTo: 11_925, rate: 0.1 },
    { upTo: 48_475, rate: 0.12 },
    { upTo: 103_350, rate: 0.22 },
    { upTo: 197_300, rate: 0.24 },
    { upTo: 250_525, rate: 0.32 },
    { upTo: 375_800, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  hoh: [
    { upTo: 17_000, rate: 0.1 },
    { upTo: 64_850, rate: 0.12 },
    { upTo: 103_350, rate: 0.22 },
    { upTo: 197_300, rate: 0.24 },
    { upTo: 250_500, rate: 0.32 },
    { upTo: 626_350, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
};

/**
 * Taxable income below which the Tax Table must be used (Form 1040 instr.,
 * "Line 16", p. 36: "If your taxable income is less than $100,000, you must
 * use the Tax Table"). Table rows: $5/$10 rows under $25, $25 rows to $3,000,
 * $50 rows to $100,000 (2025 Tax Table, i1040gi pp. 68–79).
 */
export const TAX_TABLE_LIMIT = 100_000;

/**
 * Basic standard deduction [OBBBA]. Rev. Proc. 2024-40 § 3.15(1) listed
 * $15,000 / $30,000 / $22,500; OBBBA § 70102 raised them for 2025.
 * Source: Form 1040 (2025) p. 2 margin "Standard deduction for—"
 * (SOURCES.form1040); Std. Deduction Worksheet for Dependents line 3,
 * i1040gi p. 35 (SOURCES.i1040); IRS OBBBA withholding page
 * (SOURCES.obbbaWithholding).
 */
export const STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  single: 15_750,
  mfs: 15_750,
  mfj: 31_500,
  qss: 31_500,
  hoh: 23_625,
};

/**
 * Additional standard deduction per box (age 65+/blind), § 63(f).
 * Source: Rev. Proc. 2024-40 § 3.15(3); i1040gi p. 35 dependents worksheet
 * line 4b ("$1,600 ($2,000 if single or head of household)"); consistent
 * with the Standard Deduction Chart for people born before Jan. 2, 1961.
 */
export const ADDITIONAL_STD_DEDUCTION_MARRIED = 1_600; // MFJ, MFS, QSS
export const ADDITIONAL_STD_DEDUCTION_UNMARRIED = 2_000; // single, HOH
/** Age test for 2025: born before January 2, 1961 (Form 1040 line 12d). */
export const SENIOR_BIRTH_CUTOFF = '1961-01-02';

/**
 * Dependent standard deduction floor and earned-income add-on, § 63(c)(5).
 * Source: Rev. Proc. 2024-40 § 3.15(2); i1040gi p. 35 dependents worksheet line 2.
 */
export const DEPENDENT_STD_DEDUCTION_MIN = 1_350;
export const DEPENDENT_STD_DEDUCTION_EARNED_ADDON = 450;

/**
 * Qualified dividends / capital gain 0% and 15% breakpoints, § 1(h), § 1(j)(5).
 * Source: Rev. Proc. 2024-40 § 3.03; 2025 Qualified Dividends and Capital
 * Gain Tax Worksheet lines 6 and 13, i1040gi p. 38 (SOURCES.i1040).
 */
export const CG_ZERO_RATE_MAX: Record<FilingStatus, number> = {
  single: 48_350,
  mfs: 48_350,
  mfj: 96_700,
  qss: 96_700,
  hoh: 64_750,
};
export const CG_FIFTEEN_RATE_MAX: Record<FilingStatus, number> = {
  single: 533_400,
  mfs: 300_000,
  mfj: 600_050,
  qss: 600_050,
  hoh: 566_700,
};

/** Medical expense floor: 7.5% of AGI. Source: Schedule A (2025) line 3. */
export const MEDICAL_AGI_FLOOR = 0.075;

/**
 * SALT limitation [OBBBA § 70120]. Source: Schedule A (2025) line 5e and the
 * State and Local Tax Deduction Worksheet, Schedule A instructions p. 7
 * (SOURCES.scheduleAInstr):
 *   1: $40,000; 5: $500,000 ($250,000 MFS); 7: 30% of excess;
 *   9: larger of line 8 or $10,000; 10: smaller of line 9 (half of it if MFS) or 5d.
 * Not needed when 5d <= $10,000 ($5,000 MFS).
 */
export const SALT = {
  baseCap: 40_000,
  mfsCap: 20_000,
  phaseDownStart: 500_000,
  phaseDownStartMfs: 250_000,
  phaseDownRate: 0.3,
  floor: 10_000,
  floorMfs: 5_000,
} as const;

/**
 * Child tax credit and credit for other dependents [OBBBA § 70104 for $2,200].
 * Source: Schedule 8812 (2025) (SOURCES.schedule8812): line 5 ($2,200 per
 * qualifying child), line 7 ($500 per other dependent), line 9 ($400,000 MFJ /
 * $200,000 others), line 10 (round excess UP to next $1,000), line 11 (5% =
 * $50 per $1,000 or fraction of MAGI, covering combined CTC + ODC),
 * line 16b ($1,700 refundable cap per child; also Rev. Proc. 2024-40 § 3.05),
 * line 19 ($2,500 earned-income floor), line 20 (15%), "Next" test ($5,100 =
 * 3 children x $1,700 triggers Part II-B). A child denied CTC under the
 * § 24(h)(7) SSN rule counts for the $500 ODC (§ 24(h)(4)(C)).
 */
export const CTC = {
  perChild: 2_200,
  perOtherDependent: 500,
  phaseOutStartMfj: 400_000,
  phaseOutStartOther: 200_000,
  /** $50 per $1,000 or fraction — Schedule 8812 implements this as ceil(excess/$1,000)×$1,000×5%. */
  phaseOutPer1000: 50,
  refundablePerChild: 1_700,
  earnedIncomeFloor: 2_500,
  earnedIncomeRate: 0.15,
  partIIBTrigger: 5_100,
} as const;

/**
 * Self-employment tax. Source: Schedule SE (2025) (SOURCES.scheduleSE):
 * line 4a 92.35%, line 4c $400 minimum, line 7 $176,100 social security wage
 * base (also SSA Contribution and Benefit Base, SOURCES.ssaWageBase — do not
 * use the 2026 $184,500 or 2027 $192,300 figures), line 10 12.4%, line 11
 * 2.9%, line 13 50% deduction.
 */
export const SE = {
  netEarningsFactor: 0.9235,
  minimumNetEarnings: 400,
  ssWageBase: 176_100,
  ssRate: 0.124,
  medicareRate: 0.029,
  deductionShare: 0.5,
} as const;

/**
 * Additional Medicare Tax thresholds (not indexed), § 3101(b)(2)/§ 1401(b)(2).
 * Source: Form 8959 (2025) lines 5, 9, 15 and lines 7/13 (0.9%), line 21 (1.45%).
 */
export const ADDITIONAL_MEDICARE = {
  rate: 0.009,
  regularMedicareRate: 0.0145,
  threshold: { single: 200_000, hoh: 200_000, qss: 200_000, mfj: 250_000, mfs: 125_000 } as Record<FilingStatus, number>,
} as const;

/**
 * Net investment income tax, § 1411 (thresholds not indexed).
 * Source: Instructions for Form 8960 (2025), "Line 14—Threshold Based on
 * Filing Status" (SOURCES.form8960Instr); line 17 rate 3.8%.
 */
export const NIIT = {
  rate: 0.038,
  threshold: { single: 200_000, hoh: 200_000, mfj: 250_000, qss: 250_000, mfs: 125_000 } as Record<FilingStatus, number>,
} as const;

/**
 * QBI deduction (§ 199A) for 2025. Thresholds: Rev. Proc. 2024-40 § 3.27
 * ($394,600 MFJ; $197,300 all others); Form 8995 (2025) header and Form 8995-A
 * (2025) line 3 (SOURCES.form8995, SOURCES.form8995A). 20% rates: Form 8995
 * lines 5, 14. Phase-in range ($100,000 MFJ / $50,000 others) is statutory
 * § 199A(b)(3)(B) and is not indexed; confirmed on Form 8995-A instructions
 * (SOURCES.form8995AInstr): $197,300–$247,300 (others) / $394,600–$494,600 (MFJ).
 * W-2/UBIA limit: greater of 50% of W-2 wages or 25% of W-2 wages + 2.5% of UBIA
 * (§ 199A(b)(2); Form 8995-A lines 4–12).
 */
export const QBI = {
  rate: 0.2,
  threshold: { single: 197_300, hoh: 197_300, qss: 197_300, mfs: 197_300, mfj: 394_600 } as Record<FilingStatus, number>,
  phaseInRange: { single: 50_000, hoh: 50_000, qss: 50_000, mfs: 50_000, mfj: 100_000 } as Record<FilingStatus, number>,
  wageLimitRate: 0.5,
  wageLimitAltWageRate: 0.25,
  ubiaRate: 0.025,
} as const;

/**
 * Enhanced deduction for seniors [OBBBA § 70103], Schedule 1-A Part V.
 * Source: Schedule 1-A (2025) lines 32–36 (SOURCES.schedule1A): $6,000 per
 * eligible individual, reduced by 6% of MAGI over $75,000 ($150,000 MFJ);
 * valid SSN required; married individuals must file jointly.
 */
export const SENIOR_DEDUCTION = {
  amount: 6_000,
  phaseOutStart: 75_000,
  phaseOutStartMfj: 150_000,
  phaseOutRate: 0.06,
} as const;

/** Schedule B is required when taxable interest or ordinary dividends exceed $1,500 (Schedule B (2025), Parts I/II notes; i1040gi lines 2b/3b). */
export const SCHEDULE_B_THRESHOLD = 1_500;

/** Business meals generally 50% deductible (§ 274(n)). Source: Instructions for Schedule C (2025), line 24b ("you can deduct only 50% of your business meal expenses") (SOURCES.scheduleCInstr). */
export const MEALS_DEDUCTIBLE_SHARE = 0.5;

/**
 * Alternative minimum tax, Form 6251 (2025).
 * Exemption and phase-out: Rev. Proc. 2024-40 § 3.11 (SOURCES.revProc2024_40);
 * Form 6251 (2025) line 5 table (SOURCES.form6251); instructions “What’s New”
 * (SOURCES.form6251Instr). 26% bracket cap: RP 2024-40 § 3.11 / Form 6251 line 7
 * ($239,100; $119,550 MFS). 28% subtraction = 2% × that cap ($4,782 / $2,391).
 * Senior deduction is added back (§ 56(b)(5)(D); Form 6251 lines 1a–1b).
 * SALT (Sch. A line 7) or the standard deduction is added on line 2a.
 */
export const AMT = {
  exemption: { single: 88_100, hoh: 88_100, mfj: 137_000, qss: 137_000, mfs: 68_500 } as Record<FilingStatus, number>,
  phaseOutStart: { single: 626_350, hoh: 626_350, mfj: 1_252_700, qss: 1_252_700, mfs: 626_350 } as Record<FilingStatus, number>,
  phaseOutComplete: { single: 978_750, hoh: 978_750, mfj: 1_800_700, qss: 1_800_700, mfs: 900_350 } as Record<FilingStatus, number>,
  phaseOutRate: 0.25,
  rate26Cap: { single: 239_100, hoh: 239_100, mfj: 239_100, qss: 239_100, mfs: 119_550 } as Record<FilingStatus, number>,
  rate26: 0.26,
  rate28: 0.28,
  /** Medical expenses allowed for AMT only above 10% of AGI (§ 56(b)(1)(B)). 2025 Form 6251 has no dedicated line; the 7.5%–10% difference is an “other adjustment” on line 3. */
  medicalFloor: 0.1,
  /** Extra AMTI add-on for MFS when line 4 exceeds the complete phase-out (Form 6251 line 4 instructions). */
  mfsExtraStart: 900_350,
} as const;

/**
 * Earned income credit, § 32. Source: Rev. Proc. 2024-40 § 3.06 (SOURCES.revProc2024_40).
 * Credit percentages are statutory § 32(b)(1) and are not indexed. Investment-income
 * limit $11,950: RP 2024-40 § 3.06(2). The engine looks up the printed EIC table
 * ($50 income bands, tax on the row midpoint) so filed amounts match IRS math.
 */
export const EIC = {
  earnedIncomeAmount: [8_490, 12_730, 17_880, 17_880] as const,
  maxCredit: [649, 4_328, 7_152, 8_046] as const,
  creditRate: [0.0765, 0.34, 0.4, 0.45] as const,
  phaseoutRate: [0.0765, 0.1598, 0.2106, 0.2106] as const,
  phaseoutStart: { joint: [17_730, 30_470, 30_470, 30_470] as const, other: [10_620, 23_350, 23_350, 23_350] as const },
  completedPhaseout: { joint: [26_214, 57_554, 64_430, 68_675] as const, other: [19_104, 50_434, 57_310, 61_555] as const },
  investmentIncomeLimit: 11_950,
} as const;

/**
 * Schedule 1-A Parts II–IV [OBBBA §§ 70201, 70202, 70203].
 * Source: Schedule 1-A (2025) (SOURCES.schedule1A) and IRS newsroom explainer
 * (SOURCES.schedule1ANews). Qualified-tip / overtime transition rules:
 * Notice 2025-69 (SOURCES.notice2025_69). Married taxpayers must file jointly
 * for the tip, overtime, and senior deductions; a valid SSN is required.
 *
 * Tips (Part II): cap $25,000; phase-out $150,000 ($300,000 MFJ); reduction =
 * floor(excess / $1,000) × $100 (lines 7–13).
 * Overtime (Part III): cap $12,500 ($25,000 MFJ); same $150k/$300k start and
 * floor(excess/$1,000)×$100 reduction (lines 15–21).
 * Car-loan interest (Part IV): cap $10,000; phase-out $100,000 ($200,000 MFJ);
 * reduction = ceil(excess / $1,000) × $200 (lines 24–30). Note the ceiling
 * (tips/OT use the floor).
 */
export const TIPS_DEDUCTION = {
  cap: 25_000,
  phaseOutStart: 150_000,
  phaseOutStartMfj: 300_000,
  reductionPerThousand: 100,
} as const;
export const OVERTIME_DEDUCTION = {
  cap: 12_500,
  capMfj: 25_000,
  phaseOutStart: 150_000,
  phaseOutStartMfj: 300_000,
  reductionPerThousand: 100,
} as const;
export const CAR_LOAN_INTEREST = {
  cap: 10_000,
  phaseOutStart: 100_000,
  phaseOutStartMfj: 200_000,
  reductionPerThousand: 200,
} as const;

/**
 * Charitable contribution AGI limits, § 170(b); Pub. 526 (SOURCES.pub526).
 * Cash to 50%-limit organizations: 60% of AGI. Capital-gain / non-cash property
 * to those organizations: 30% of AGI. Overall gifts for a year cannot exceed
 * 60% of AGI. Five-year carryover of the unused amount. Deliberate
 * simplification: every cash gift is treated as a 60% gift to a public charity
 * and every non-cash gift as a 30% gift; 20% property, 30% cash-to-30% orgs,
 * and basis-election 50% property are not distinguished.
 */
export const CHARITY = {
  cashAgiLimit: 0.6,
  nonCashAgiLimit: 0.3,
  overallAgiLimit: 0.6,
} as const;

/**
 * Home-acquisition indebtedness cap, § 163(h)(3)(F); Pub. 936 (SOURCES.pub936).
 * Interest is deductible on up to $750,000 ($375,000 MFS) of average
 * acquisition-debt balance. Deliberate simplification: the pre-15 Dec 2017
 * $1,000,000 grandfather rule is not applied — enter only post-TCJA debt, or
 * enter the already-limited deductible interest and leave the balance at 0.
 */
export const MORTGAGE_DEBT_LIMIT = 750_000;
export const MORTGAGE_DEBT_LIMIT_MFS = 375_000;

/** Capital-loss deduction limit, § 1211(b). Schedule D (2025) line 21 (SOURCES.scheduleD). */
export const CAPITAL_LOSS_LIMIT = 3_000;
export const CAPITAL_LOSS_LIMIT_MFS = 1_500;

/**
 * Self-employed retirement plan limits for 2025.
 * Elective deferral $23,500 and defined-contribution dollar limit $70,000:
 * IRS Notice 2024-80 (SOURCES.notice2024_80), implementing § 402(g)/§ 415(c)
 * as adjusted. Age-50 catch-up $7,500: § 414(v)(2)(B)(i) (not indexed in 2025
 * beyond the 2024 amount; Notice 2024-80 confirms $7,500). Compensation cap
 * $350,000: Notice 2024-80 / RP 2024-40 § 3.21. Employer contribution for a
 * sole proprietor is 20% of net SE earnings after the ½-SE-tax deduction
 * (Pub. 560 / Pub. 535), which is the algebraic equivalent of 25% of
 * compensation after the contribution itself.
 */
export const RETIREMENT = {
  electiveDeferral: 23_500,
  catchUp50: 7_500,
  definedContributionLimit: 70_000,
  compensationCap: 350_000,
  solePropEmployerRate: 0.2,
} as const;

/**
 * Estimated-tax penalty, Form 2210 (2025).
 * Required annual payment: smaller of 90% of the 2025 tax or 100% of the 2024
 * tax (110% if 2024 AGI > $150,000 / $75,000 MFS). Source: Form 2210 (2025)
 * Part I and instructions (SOURCES.form2210, SOURCES.form2210Instr).
 * The 2025 Form 2210 no longer prints a “short method.” This engine uses the
 * regular method under the equal-installment assumption that the old short
 * method required (timely equal estimates; withholding treated as paid equally).
 * Underpayment interest rate: 7% for every calendar quarter of 2025 and for
 * 2026 Q1 (SOURCES.quarterlyRates). Days in each installment window from the
 * 2025 Form 2210 Part III dates: 4/15, 6/15, 9/15, 1/15, 4/15.
 */
export const ESTIMATED_TAX = {
  currentYearPct: 0.9,
  priorYearPct: 1.0,
  priorYearHighIncomePct: 1.1,
  highIncomeAgi: 150_000,
  highIncomeAgiMfs: 75_000,
  penaltyThreshold: 1_000,
  annualRate: 0.07,
  /** Days from each required installment date to the next (or April 15, 2026). */
  days: [61, 92, 122, 90] as const,
} as const;

/**
 * § 179 expensing [OBBBA § 70306]. Source: 2025 Instructions for Form 4562
 * (SOURCES.form4562Instr). Overrides Rev. Proc. 2024-40 § 3.21 ($1.25M / $3.13M).
 * Depreciation on Schedule C is entered as a dollar amount — these caps are
 * cited so a 2025 return does not use the superseded Rev. Proc. figures.
 */
export const SECTION_179 = {
  limit: 2_500_000,
  phaseoutStart: 4_000_000,
  suvLimit: 31_300,
} as const;

/**
 * Roth IRA contribution MAGI phase-out, § 408A(c)(3); Notice 2024-80
 * (“For singles and heads of household, the income phase-out range is
 * between $150,000 and $165,000”).
 */
export const ROTH_CONTRIBUTION_PHASEOUT = {
  mfjStart: 236_000,
  mfjEnd: 246_000,
  singleStart: 150_000,
  singleEnd: 165_000,
  mfsEnd: 10_000,
} as const;

/**
 * Kiddie-tax units, § 1(g); Rev. Proc. 2024-40 § 3.02.
 * Form 8615 is required when unearned income is more than $2,700
 * (2025 Instructions for Form 8615, Who Must File; SOURCES.form8615Instr).
 * Form 8615 itself is not prepared.
 */
export const KIDDIE_TAX = {
  unit: 1_350,
  form8615Threshold: 2_700,
  form8814Min: 1_350,
  form8814Max: 13_500,
} as const;

/**
 * Adoption credit, § 23; Rev. Proc. 2024-40 § 3.04; refundable portion
 * OBBBA § 70402 (new Form 1040 line 30, up to $5,000). Not computed — the
 * interview does not collect Form 8839. Figures are cited so line 30 is not
 * left off the 2025 map.
 */
export const ADOPTION_CREDIT = {
  max: 17_280,
  phaseoutStart: 259_190,
  phaseoutEnd: 299_190,
  refundableMax: 5_000,
} as const;

/** Qualifying-relative gross-income test, § 152(d)(1)(B); Rev. Proc. 2024-40. */
export const QUALIFYING_RELATIVE_GROSS_INCOME = 5_200;

/**
 * Standard mileage rates. Notice 2025-5 (SOURCES.notice2025_5).
 * Schedule C currently takes a dollar car/truck amount, not miles.
 */
export const MILEAGE = {
  businessCents: 70,
  medicalMovingCents: 21,
  charitableCents: 14,
  depreciationComponentCents: 33,
} as const;
