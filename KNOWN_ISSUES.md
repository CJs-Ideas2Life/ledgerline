# Known issues

Ledgerline is an educational 2025 Form 1040 aid. It is not tax advice, has no warranty, does not e-file, and is not affiliated with, endorsed by, or approved by the IRS or any accounting or law firm.

This file is the documented scope list: intentional simplifications from the Rules & Why registry (`src/engine/rules/registry.ts`) and the README. The same list is shown in the app at `/known-issues`.

These are not a complete-return claim. When a rule is later implemented, update this file and the README.

## Documented simplifications (Rules & Why + README)

Each registry line is quoted so this file can be checked against `src/engine/rules/registry.ts`.

- **Home-acquisition indebtedness limit** — Pre-15 Dec 2017 $1,000,000 grandfathering is not applied. Leave average balance at $0 if the interest you typed is already limited.
- **Investment-interest limitation** — No line-4g election to treat qualified dividends or long-term capital gain as investment income.
- **Charitable contribution AGI limits** — Every cash gift is treated as a 60% gift to a public charity and every non-cash gift as a 30% gift. 20% property, 30% cash-to-30% organizations, and the basis-election 50% property rules are not distinguished. Carryover is applied as leftover 60% cash-type gifts.
- **Wages** — Lines 1b–1h (combat pay, Medicaid waiver, etc.) are not entered; 1z = 1a.
- **When Schedule B is required** — FinCEN 114 and Form 8938 are flagged, not prepared.
- **Holding period on Form 8949** — Auto term uses a 365-day year rather than the exact calendar-date anniversary (acquired June 1, sold June 1 next year).
- **Collectibles and unrecaptured § 1250** — 28% collectibles rate and 25% unrecaptured § 1250 rate are flagged, not computed.
- **Additional income** — Schedule 1 Part I items other than Schedule C (alimony, unemployment, gambling, etc.) are not entered.
- **Adjustments to income** — Schedule 1 Part II items other than SE tax, SE health, and SEP/solo 401(k) are not entered.
- **Alternative minimum tax** — Preference items other than the senior-deduction addback, SALT / standard deduction, and the medical 10% floor are not computed. Unrecaptured § 1250 is omitted from Part III.
- **Schedule C net profit** — Assumes all investment is at risk (line 32a) and does not apply the excess-business-loss limit (Form 461).
- **Child tax credit / Schedule 8812** — Credit Limit Worksheet A assumes no Schedule 3 nonrefundable credits.
- **Earned income credit table** — No Form 8862 / disallowed-in-prior-year rules. Childless EIC uses date of birth, year-end age, or the 65+ flag; ages 17/24/25/64/65 are distinguished when a date or age is given.
- **Net investment income tax** — Form 8960 Part II investment expenses are not deducted.
- **Estimated-tax penalty** — 2025 Form 2210 has no short method. Annualized-income (Schedule AI) and actually-paid-on dates are not offered — withholding and estimates are treated as four equal timely payments.
- **Section 179 expensing limit** — Form 4562 is not prepared. Enter the already-limited §179 / depreciation dollar amount on Schedule C.
- **Kiddie-tax threshold** — Form 8615 / Form 8814 are not prepared. A child’s unearned income is taxed on the parent return only if the user already included it.
- **Adoption credit and refundable line 30** — Form 8839 / 1040 line 30 are not computed. Older line maps that treated line 30 as something else are stale.
- **Premium tax credit percentages** — Form 8962 is not prepared. APTC repayment and net PTC are out of scope.
- **Standard mileage rates** — Miles are not collected; enter the already-computed dollar amount on Schedule C line 9.
- **Qualifying-relative gross-income test** — The $5,200 gross-income test is not re-checked; the taxpayer marks other-dependent status.

Also out of scope in the README (and not a filed return):

- Education and other Schedule 3 credits
- Form 1116 (foreign tax credit)
- ISO / depreciation AMT preferences (see the AMT simplification above)
- State returns
- e-file

## Out of scope for this product (scorecard follow-up)

These are not missing bug-fixes. Ledgerline is a browser educational aid, not filing software or a multi-client practice suite. The 2026-10-22 scorecard (`d6d4395`, issue #26) treated several of them as gaps. They stay documented here so a complete-filing claim cannot be inferred.

- **Official IRS forms and e-file** — No generated official Form 1040 PDF, no MeF / e-file, no IRS submission. The print page is an estimate for review.
- **Form 8615 / Form 8814 (kiddie tax)** — Not prepared. A child’s unearned income is taxed on the parent return only if the user already included it.
- **S corporation / K-1 / shareholder basis** — No Form 1120-S, Schedule K-1, stock/debt basis, or entity-to-person QBI link.
- **Rental and passive-activity workpapers** — No Schedule E / Form 8582 engine.
- **Document intake and prior-year upload** — No PDF/OCR pipeline, no prior-return import, no source-receipt vault.
- **Encrypted workspace / preferred save folder / sanitized sharing copy** — Drafts are plaintext `localStorage` in this browser. There is a clear-data control and a recovery JSON download. There is no password-encrypted vault, OS folder picker, or redacted sharing packet. Optional encryption was not added because a password prompt without a tested key-management story would be theater.
- **Multi-client practice workflow** — One draft per browser profile. No client picker, organizer, or preparer notes database.
- **Independent assurance** — `src/oracle` is a same-author cross-check, not an independent review or a population accuracy rate.

The separately written cross-check in `src/oracle/` shares these simplifications. It is not an independent assessment.
