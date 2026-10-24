import { writeScorecard } from '../src/oracle/scorecard';

const s = writeScorecard();
console.log(`Scorecard: ${s.casePass}/${s.cases} cases, ${s.linesMatched}/${s.linesCompared} lines (${s.overallPct}%)`);
for (const m of s.modules) console.log(`  ${m.module}: ${m.pct}% (${m.matched}/${m.compared})`);
if (s.caseFail) process.exitCode = 1;
