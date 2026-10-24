# Ledgerline 2025 accuracy scorecard

Generated 2026-10-23T05:32:01.207Z

Oracle: separately written Form 1040 instruction walk (src/oracle; does not import engine code). Same author as the engine — not an independent assessment. PolicyEngine-US / Tax-Calculator not used — see src/oracle/README.md.

Compared lines are the intersection of keys both implementations computed. The oracle is a simpler instruction walk and does not always fill worksheet scratch lines (Schedule 1-A MAGI worksheets, unused Form 1040 zeros, etc.).

## Overall

| Cases | Pass | Fail | Lines compared | Lines matched | Accuracy |
| --- | ---: | ---: | ---: | ---: | ---: |
| 165 | 165 | 0 | 31492 | 31492 | **100%** |

## Per module

| Module | Compared | Matched | Accuracy |
| --- | ---: | ---: | ---: | ---: |
| form1040 | 7590 | 7590 | 100% |
| form2210 | 169 | 169 | 100% |
| form4952 | 990 | 990 | 100% |
| form6251 | 1834 | 1834 | 100% |
| form8959 | 2310 | 2310 | 100% |
| form8960 | 1650 | 1650 | 100% |
| form8995 | 1650 | 1650 | 100% |
| form8995A | 18 | 18 | 100% |
| qdcgWorksheet | 225 | 225 | 100% |
| schedule1 | 990 | 990 | 100% |
| schedule1A | 1958 | 1958 | 100% |
| schedule2 | 990 | 990 | 100% |
| schedule8812 | 2974 | 2974 | 100% |
| scheduleA | 3960 | 3960 | 100% |
| scheduleB | 990 | 990 | 100% |
| scheduleC | 662 | 662 | 100% |
| scheduleD | 1320 | 1320 | 100% |
| scheduleSE | 222 | 222 | 100% |
| totals | 990 | 990 | 100% |

## Failed cases

None. Engine and oracle agreed on every compared line.
## Determinism

Money amounts are IRS whole dollars (integers). The Tax Computation Worksheet rounds to cents, then to dollars. See rule `round-whole-dollar`. Running a case twice, or with shuffled W-2 / 1099 / business order, must produce byte-identical integer line maps (`tests/engine/determinism.test.ts`).

