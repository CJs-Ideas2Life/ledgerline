// SPDX-License-Identifier: AGPL-3.0-or-later
export * from './types';
export * from './constants2025';
export * from './rules';
export { computeReturn, scheduleC } from './compute';
export { regularTax, taxTable, taxTableRow, taxComputationWorksheet, scheduleTax, qdcgWorksheet, marginalRate } from './taxComputation';
export { dollars, amt, parseMoneyInput } from './money';
export * from './factory';
export { scheduleD, form8949 } from './scheduleD';
export { schedule1A } from './schedule1A';
export { computeQbi } from './qbi';
export { form6251 } from './amt';
export { earnedIncomeCredit, eicTableLookup, eicTableMidpoint, eicStatutoryAt, eicTableRowBounds } from './eic';
export { form2210 } from './form2210';
export { creditEligibility, yearEndAge, ageFromDob, is65OrOver, is25To64, dependentUnder17, dependentEicQualifying } from './eligibility';
export { validateMoneyFields, validateSavedInput, unsupportedFacts, buildScope } from './validate';
