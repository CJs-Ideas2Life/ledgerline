# Ledgerline 2025 test-return library

Each file in `cases/` is one self-contained 2025 Form 1040 scenario. The Vitest
file `tests/engine/testData.test.ts` loads every `*.json` case and checks the
engine against the expected lines. `npm test` runs this library together with
the other engine unit tests. `npm run scorecard` compares the engine to the
separately written cross-check in `src/oracle/` (it does not import engine
code) and writes `SCORECARD.md` plus
`scorecard.json`. Property and determinism checks live in
`tests/engine/property.test.ts` and `tests/engine/determinism.test.ts`.

## File format

```json
{
  "id": "single-w2-50k",
  "category": "wages",
  "description": "Plain-English picture of the taxpayer.",
  "derivation": "How the expected numbers were figured, with IRS form/worksheet/Rev. Proc. cites.",
  "input": { "filingStatus": "single", "w2s": [{ "wages": 50000, "federalWithholding": 6000 }] },
  "expected": {
    "form1040": { "15": 34250, "16": 3875, "24": 3875, "37": 0 },
    "standardDeduction": 15750,
    "refund": 2125,
    "amountOwed": 0
  }
}
```

`input` is merged onto `blankReturn()` (missing fields stay at the blank
defaults: valid SSN, no dependents, $0 everywhere). You only need to write the
facts that make this taxpayer different.

`expected` is a sparse assertion map. Every key you list is checked:

| Key | What is compared |
| --- | --- |
| `form1040`, `schedule1`, `schedule1A`, `schedule2`, `scheduleA`, `scheduleB`, `scheduleD`, `schedule8812`, `form8995`, `form8995A`, `form6251`, `form4952`, `form2210`, `form8959`, `form8960` | Matching line numbers on that form |
| `scheduleC.0`, `scheduleSE.0` | First Schedule C / SE (use `.1` for the second) |
| `standardDeduction`, `itemizedDeduction`, `usesItemized`, `taxMethod` | Engine totals / flags |
| `refund`, `amountOwed` | Form 1040 lines 35a / 37 (penalty included when Form 2210 is computed) |
| `charityCarryoverToNextYear`, `investmentInterestCarryoverToNextYear` | Carryovers |
| `warningsIncludes` | Substrings that must appear in a warning |

## How to add a case

1. Copy a nearby file in `cases/`.
2. Give it a new `id` (the file name should match: `my-id.json`).
3. Write the taxpayer story and a derivation that a CPA can re-perform from
   the 2025 instructions (Tax Table row, worksheet lines, Rev. Proc. 2024-40
   section, Form 6251 line 5 table, etc.).
4. Put only independently figured numbers in `expected`. Do not paste engine
   output and call it a test.
5. Run `npm test`. If a line misses, either the engine is wrong or the hand
   calc is — fix the one that does not follow the cited IRS rule.

Whole-dollar rounding is the Form 1040 method (50 cents rounds away from
zero). Taxable income under $100,000 uses the Tax Table (tax on the row
midpoint); $100,000 and up uses the Tax Computation Worksheet. EIC uses the
printed 2025 EIC table (official $50-band construction with the earned-income-amount
row and leftover terminal cutoffs), not the raw statutory formula and not a raw
midpoint of every $50 band.

Annual dollar figures live in `src/engine/rules/ty2025-parameters.json` and
must match `constants2025.ts` (`tests/engine/packConstants.test.ts`).
