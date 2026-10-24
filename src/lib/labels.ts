// SPDX-License-Identifier: AGPL-3.0-or-later
/** Short line descriptions for the review page (paraphrased from the 2025 IRS forms). */
export const F1040_LINES: [string, string][] = [
  ['1a', 'Wages from Form(s) W-2, box 1'],
  ['1z', 'Total wages and other earned income'],
  ['2a', 'Tax-exempt interest'],
  ['2b', 'Taxable interest'],
  ['3a', 'Qualified dividends'],
  ['3b', 'Ordinary dividends'],
  ['7a', 'Capital gain or (loss)'],
  ['4b', 'IRA distributions, taxable amount'],
  ['5b', 'Pensions and annuities, taxable amount'],
  ['6b', 'Social security benefits, taxable amount'],
  ['8', 'Additional income from Schedule 1'],
  ['9', 'Total income'],
  ['10', 'Adjustments to income from Schedule 1'],
  ['11b', 'Adjusted gross income'],
  ['12e', 'Standard or itemized deduction'],
  ['13a', 'Qualified business income deduction'],
  ['13b', 'Additional deductions from Schedule 1-A'],
  ['14', 'Total deductions'],
  ['15', 'Taxable income'],
  ['16', 'Tax'],
  ['17', 'Amount from Schedule 2, line 3'],
  ['18', 'Tax plus Schedule 2 line 3'],
  ['19', 'Child tax credit / credit for other dependents'],
  ['20', 'Amount from Schedule 3, line 8'],
  ['21', 'Total nonrefundable credits'],
  ['22', 'Tax after credits'],
  ['23', 'Other taxes incl. self-employment tax (Schedule 2)'],
  ['24', 'Total tax'],
  ['25a', 'Federal withholding — W-2'],
  ['25b', 'Federal withholding — 1099'],
  ['25c', 'Federal withholding — other (Additional Medicare Tax)'],
  ['25d', 'Total withholding'],
  ['26', '2025 estimated tax payments'],
  ['27a', 'Earned income credit'],
  ['28', 'Additional child tax credit'],
  ['32', 'Other payments and refundable credits'],
  ['33', 'Total payments'],
  ['34', 'Overpaid'],
  ['35a', 'Refund'],
  ['37', 'Amount you owe'],
  ['38', 'Estimated tax penalty'],
];

export const SCH_A_LINES: [string, string][] = [
  ['1', 'Medical and dental expenses'], ['2', 'AGI'], ['3', '7.5% of AGI'], ['4', 'Deductible medical'],
  ['5a', 'State/local income or sales tax'], ['5b', 'Real estate taxes'], ['5c', 'Personal property taxes'],
  ['5d', 'Total SALT'], ['5e', 'SALT after 2025 limit'], ['6', 'Other taxes'], ['7', 'Total taxes'],
  ['8a', 'Mortgage interest (Form 1098)'], ['8b', 'Mortgage interest not on 1098'], ['8c', 'Points not on 1098'],
  ['8e', 'Total home mortgage interest'], ['9', 'Investment interest'], ['10', 'Total interest'],
  ['11', 'Gifts by cash or check'], ['12', 'Other than cash'], ['13', 'Carryover'], ['14', 'Total gifts'],
  ['15', 'Casualty and theft losses'], ['16', 'Other itemized deductions'], ['17', 'Total itemized deductions'],
];

export const SCH_B_LINES: [string, string][] = [
  ['1', 'Interest (all payers)'], ['2', 'Total interest'], ['3', 'Excludable savings bond interest'], ['4', 'Taxable interest'],
  ['5', 'Ordinary dividends (all payers)'], ['6', 'Total ordinary dividends'],
];

export const SCH_C_LINES: [string, string][] = [
  ['1', 'Gross receipts'], ['2', 'Returns and allowances'], ['3', 'Net receipts'], ['4', 'Cost of goods sold'],
  ['5', 'Gross profit'], ['6', 'Other income'], ['7', 'Gross income'], ['8', 'Advertising'], ['9', 'Car and truck'],
  ['10', 'Commissions and fees'], ['11', 'Contract labor'], ['12', 'Depletion'], ['13', 'Depreciation / §179'],
  ['14', 'Employee benefit programs'], ['15', 'Insurance (not health)'], ['16a', 'Mortgage interest'], ['16b', 'Other interest'],
  ['17', 'Legal and professional'], ['18', 'Office expense'], ['19', 'Pension/profit-sharing'], ['20a', 'Rent — vehicles/equipment'],
  ['20b', 'Rent — other property'], ['21', 'Repairs'], ['22', 'Supplies'], ['23', 'Taxes and licenses'], ['24a', 'Travel'],
  ['24b', 'Deductible meals (50%)'], ['25', 'Utilities'], ['26', 'Wages'], ['27b', 'Other expenses'],
  ['28', 'Total expenses'], ['29', 'Tentative profit'], ['30', 'Business use of home'], ['31', 'Net profit or (loss)'],
  ['35', 'Beginning inventory'], ['36', 'Purchases'], ['37', 'Cost of labor'], ['38', 'Materials and supplies'],
  ['39', 'Other costs'], ['40', 'Subtotal'], ['41', 'Ending inventory'], ['42', 'Cost of goods sold'],
];

export const SCH_SE_LINES: [string, string][] = [
  ['2', 'Net profit from Schedule C'], ['3', 'Combined'], ['4a', '× 92.35%'], ['6', 'Net earnings from SE'],
  ['7', '2025 social security wage base'], ['8a', 'Social security wages (W-2 box 3)'], ['9', 'Remaining wage base'],
  ['10', 'Social security portion (12.4%)'], ['11', 'Medicare portion (2.9%)'], ['12', 'Self-employment tax'],
  ['13', 'Deduction for one-half of SE tax'],
];

export const SCH_8812_LINES: [string, string][] = [
  ['3', 'Modified AGI'], ['4', 'Qualifying children under 17 with SSN'], ['5', '× $2,200'], ['6', 'Other dependents'],
  ['7', '× $500'], ['8', 'Total before phase-out'], ['9', 'Phase-out threshold'], ['10', 'Excess (rounded up to $1,000)'],
  ['11', 'Phase-out (5%)'], ['12', 'Credit after phase-out'], ['13', 'Credit limit (tax)'], ['14', 'Nonrefundable credit'],
  ['16a', 'Unused credit'], ['16b', 'Children × $1,700'], ['17', 'Smaller of 16a/16b'], ['18a', 'Earned income'],
  ['19', 'Earned income over $2,500'], ['20', '× 15%'], ['21', 'Withheld SS/Medicare (Part II-B)'], ['27', 'Additional child tax credit'],
];

export const F8995_LINES: [string, string][] = [
  ['2', 'Total qualified business income'], ['3', 'Prior-year QBI loss carryforward'], ['4', 'Net QBI'],
  ['5', 'QBI component (20%)'], ['10', 'Deduction before income limit'], ['11', 'Taxable income before QBI deduction'],
  ['12', 'Net capital gain + qualified dividends'], ['13', 'Line 11 − line 12'], ['14', 'Income limitation (20%)'],
  ['15', 'QBI deduction'], ['16', 'QBI loss carryforward to 2026'],
];

export const QDCG_LINES: [string, string][] = [
  ['1', 'Taxable income'], ['2', 'Qualified dividends'], ['3', 'Capital gain distributions'], ['4', 'Total preferential income'],
  ['5', 'Ordinary taxable income'], ['6', '0% rate maximum'], ['9', 'Taxed at 0%'], ['17', 'Taxed at 15%'], ['18', '15% tax'],
  ['20', 'Taxed at 20%'], ['21', '20% tax'], ['22', 'Tax on ordinary income'], ['23', 'Tax using preferential rates'],
  ['24', 'Regular tax on all income'], ['25', 'Tax (smaller of 23 and 24)'],
];

export const SCH_D_LINES: [string, string][] = [
  ['7', 'Net short-term capital gain or (loss)'],
  ['13', 'Capital gain distributions'],
  ['15', 'Net long-term capital gain or (loss)'],
  ['16', 'Combined net gain or (loss)'],
  ['21', 'Amount on Form 1040 line 7a'],
];

export const F6251_LINES: [string, string][] = [
  ['1a', 'Form 1040 line 14 minus senior deduction'],
  ['1b', 'AGI minus line 1a (taxable income + senior addback)'],
  ['2a', 'Taxes from Schedule A, or the standard deduction'],
  ['3', 'Medical 7.5% / 10% AMT difference'],
  ['4', 'Alternative minimum taxable income'],
  ['5', 'Exemption'],
  ['6', 'AMTI minus exemption'],
  ['7', 'Tentative minimum tax before AMT FTC'],
  ['9', 'Tentative minimum tax'],
  ['10', 'Regular tax'],
  ['11', 'AMT (to Schedule 2 line 2)'],
];

export const F8995A_LINES: [string, string][] = [
  ['10', 'QBI component after W-2 / UBIA / SSTB limits'],
  ['11', 'Taxable income before QBI deduction'],
  ['14', 'Income limitation (20%)'],
  ['15', 'QBI deduction'],
];

export const F4952_LINES: [string, string][] = [
  ['1', 'Investment interest paid'],
  ['2', 'Carryover from 2024'],
  ['3', 'Total'],
  ['5', 'Net investment income'],
  ['8', 'Deductible investment interest'],
];

export const F2210_LINES: [string, string][] = [
  ['4', '90% of current-year tax'],
  ['8', '100% or 110% of last year’s tax'],
  ['9', 'Required annual payment'],
  ['11', 'Withholding plus estimates'],
  ['19', 'Penalty'],
];

export const S1A_LINES: [string, string][] = [
  ['3', 'MAGI'],
  ['7', 'Tips after $25,000 cap'],
  ['13', 'Qualified tips deduction'],
  ['15', 'Overtime after cap'],
  ['21', 'Qualified overtime deduction'],
  ['24', 'Car-loan interest after $10,000 cap'],
  ['30', 'Car-loan interest deduction'],
  ['35', 'Per-person senior amount'],
  ['36a', 'Senior deduction — you'],
  ['36b', 'Senior deduction — spouse'],
  ['37', 'Enhanced deduction for seniors'],
  ['38', 'Total additional deductions (to 1040 line 13b)'],
];

export const STATUS_LABEL: Record<string, string> = {
  single: 'Single',
  mfj: 'Married filing jointly',
  mfs: 'Married filing separately',
  hoh: 'Head of household',
  qss: 'Qualifying surviving spouse',
};
