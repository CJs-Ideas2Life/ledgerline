# Form 1040 cross-check

This folder is a **second, simpler implementation** of the core 2025 Form 1040
walk, written from the IRS form and instruction line order. It does **not**
import `src/engine` computation, constants, or money helpers. It was written by
the same agent as the engine, so it is a separately written cross-check, not an
independent assessment.

## What we used

A first-party TypeScript cross-check (`compute1040.ts`) that walks:

Form 1040 lines 1–38, Schedules 1 / 1-A / 2 / A / B / C / D / SE / 8812,
Forms 8949, 8995, 8995-A, 6251, 4952, 2210, 8959, 8960, and the Qualified
Dividends and Capital Gain Tax Worksheet.

2025 dollar figures are duplicated in `params2025.ts` and cited to the same
primary sources as the engine (Rev. Proc. 2024-40, 2025 forms/instructions,
OBBBA P.L. 119-21, Notice 2024-80 / 2025-69).

## What we did not use

**PolicyEngine-US** (AGPL-3.0) and **Tax-Calculator** (PSL) were considered
for a third-party cross-check. They are not wired into CI because:

1. 2025 OBBBA items this return must get right — SALT $40,000 with MAGI
   phase-down, the $6,000 senior deduction, qualified tips / overtime /
   car-loan interest, CTC $2,200 — are not reliably present in a pinned
   public release we can call from GitHub Actions.
2. Those models compute *liability*, not Form 1040 *line* agreement.
3. AGPL would constrain how we could keep an extracted comparison script
   in this repo.

If a license-compatible, OBBBA-complete calculator becomes available, add
it as a second oracle column in the scorecard.

## Known shared simplifications

The cross-check uses the same documented simplifications as the engine (see the
Rules & Why registry): Tax Table uses $50-band midpoints; the EIC table uses
the official 2025 construction ($50 bands, first row $1–$50, earned-income-amount
and phase-out-start rows print the maximum credit, leftover starred terminals at
completed-phaseout cutoffs) computed in this folder, not imported from the engine; no 28%/25%
collectibles / §1250 worksheets; charity 60%/30% only; no pre-2017 $1M
mortgage grandfather; Form 2210 equal-installment regular method; AMT only
for senior addback, SALT/standard deduction, and the medical 10% floor;
Form 8839 / 8962 not prepared. This is a same-author separately written
cross-check, not an independent assessment.
