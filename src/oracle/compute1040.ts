// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Independent Form 1040 (2025) walk, written from the form / instruction line
 * order. Do not import src/engine — this file is the second implementation.
 */
import {
  ADD_MED, AMT, BRACKETS, CAPLOSS, CAR, CG0, CG15, CHARITY, CTC, DEP_STD, EIC, EST,
  EXTRA_STD, MEALS, MED_FLOOR, MORT, NIIT, OT, QBI, RET, SALT, SE, SENIOR, STD,
  TABLE_LIMIT, TIPS, type Status,
} from './params2025';
import { add, atLeast0, money, toCents, whole } from './round';

export type Lines = Record<string, number>;

export interface OraclePerson {
  bornBefore1961?: boolean | null;
  age50OrOver?: boolean | null;
  blind?: boolean | null;
  hasValidSSN?: boolean | null;
}

export interface OracleInput {
  filingStatus?: Status | string;
  taxpayer?: OraclePerson;
  spouse?: OraclePerson;
  canBeClaimedAsDependent?: boolean | null;
  spouseItemizes?: boolean | null;
  mfsLivedApart?: boolean | null;
  dependents?: { under17?: boolean | null; hasValidSSN?: boolean | null; eicQualifying?: boolean | null }[];
  w2s?: {
    owner?: string; wages?: number; federalWithholding?: number; socialSecurityWages?: number;
    socialSecurityTax?: number; medicareWages?: number; medicareTax?: number;
    qualifiedTips?: number; qualifiedOvertime?: number;
  }[];
  interest?: { taxable?: number; taxExempt?: number; federalWithholding?: number }[];
  dividends?: { ordinary?: number; qualified?: number; capitalGainDistributions?: number; federalWithholding?: number }[];
  foreignAccount?: boolean;
  foreignTrust?: boolean;
  businesses?: {
    owner?: string; grossReceipts?: number; returnsAllowances?: number; hasInventory?: boolean;
    cogs?: { beginningInventory?: number; purchases?: number; costOfLabor?: number; materialsSupplies?: number; otherCosts?: number; endingInventory?: number };
    otherIncome?: number;
    expenses?: { [k: string]: number | undefined };
    homeOffice?: number; isSstb?: boolean; ubia?: number; qualifiedTips?: number;
    seHealthInsurance?: number; sepOrSoloEmployer?: number; solo401kElective?: number;
  }[];
  capitalGains?: { dateAcquired?: string; dateSold?: string; proceeds?: number; cost?: number; term?: string; collectible?: boolean; unrecaptured1250?: boolean }[];
  stLossCarryover?: number;
  ltLossCarryover?: number;
  itemized?: { [k: string]: number | boolean | undefined };
  forceItemize?: boolean;
  qbiLossCarryforward?: number;
  estimatedPayments?: number;
  carLoanInterest?: number;
  coveredByEmployerHealthPlan?: boolean;
  priorYearTax?: number;
  priorYearAgi?: number;
}

export interface OracleResult {
  form1040: Lines;
  schedule1: Lines;
  schedule1A: Lines;
  schedule2: Lines;
  scheduleA: Lines;
  scheduleB: Lines;
  scheduleC: Lines[];
  scheduleSE: Lines[];
  scheduleD: Lines;
  schedule8812: Lines;
  form8995: Lines;
  form8995A: Lines | null;
  form6251: Lines;
  form4952: Lines;
  form2210: Lines;
  form8959: Lines;
  form8960: Lines;
  qdcgWorksheet: Lines | null;
  standardDeduction: number;
  itemizedDeduction: number;
  usesItemized: boolean;
  taxMethod: 'table' | 'computation-worksheet' | 'qdcg-worksheet';
  refund: number;
  amountOwed: number;
}

const fsOf = (s?: string): Status => (s === 'mfj' || s === 'mfs' || s === 'hoh' || s === 'qss' ? s : 'single');

function scheduleTax(ti: number, status: Status): number {
  let tax = 0;
  let lo = 0;
  for (const b of BRACKETS[status]) {
    if (ti <= lo) break;
    const top = Math.min(ti, b.upTo);
    tax += (top - lo) * b.rate;
    lo = b.upTo;
  }
  return tax;
}

function tableRow(ti: number): { lo: number; hi: number } {
  if (ti < 5) return { lo: 0, hi: 5 };
  if (ti < 15) return { lo: 5, hi: 15 };
  if (ti < 25) return { lo: 15, hi: 25 };
  if (ti < 3000) {
    const lo = Math.floor(ti / 25) * 25;
    return { lo, hi: lo + 25 };
  }
  const lo = Math.floor(ti / 50) * 50;
  return { lo, hi: lo + 50 };
}

function regularTax(ti: number, status: Status): number {
  const t = atLeast0(ti);
  if (t < TABLE_LIMIT) {
    if (t < 5) return 0;
    const { lo, hi } = tableRow(t);
    return whole(scheduleTax((lo + hi) / 2, status));
  }
  return whole(toCents(scheduleTax(t, status)));
}

function qdcg(ti: number, qd: number, cg: number, status: Status): Lines {
  const l: Lines = {};
  l[1] = atLeast0(ti);
  l[2] = atLeast0(qd);
  l[3] = atLeast0(cg);
  l[4] = l[2] + l[3];
  l[5] = atLeast0(l[1] - l[4]);
  l[6] = CG0[status];
  l[7] = Math.min(l[1], l[6]);
  l[8] = Math.min(l[5], l[7]);
  l[9] = l[7] - l[8];
  l[10] = Math.min(l[1], l[4]);
  l[11] = l[9];
  l[12] = l[10] - l[11];
  l[13] = CG15[status];
  l[14] = Math.min(l[1], l[13]);
  l[15] = l[5] + l[9];
  l[16] = atLeast0(l[14] - l[15]);
  l[17] = Math.min(l[12], l[16]);
  l[18] = whole(l[17] * 0.15);
  l[19] = l[9] + l[17];
  l[20] = l[10] - l[19];
  l[21] = whole(l[20] * 0.2);
  l[22] = regularTax(l[5], status);
  l[23] = l[18] + l[21] + l[22];
  l[24] = regularTax(l[1], status);
  l[25] = Math.min(l[23], l[24]);
  return l;
}

function schC(b: NonNullable<OracleInput['businesses']>[number]): Lines {
  const l: Lines = {};
  const e = b.expenses ?? {};
  l[1] = money(b.grossReceipts);
  l[2] = money(b.returnsAllowances);
  l[3] = l[1] - l[2];
  if (b.hasInventory) {
    const c = b.cogs ?? {};
    l[35] = money(c.beginningInventory);
    l[36] = money(c.purchases);
    l[37] = money(c.costOfLabor);
    l[38] = money(c.materialsSupplies);
    l[39] = money(c.otherCosts);
    l[40] = l[35] + l[36] + l[37] + l[38] + l[39];
    l[41] = money(c.endingInventory);
    l[42] = l[40] - l[41];
  } else {
    l[42] = 0;
  }
  l[4] = l[42];
  l[5] = l[3] - l[4];
  l[6] = money(b.otherIncome);
  l[7] = l[5] + l[6];
  const keys: [string, number][] = [
    ['8', money(e.advertising)], ['9', money(e.carTruck)], ['10', money(e.commissionsFees)],
    ['11', money(e.contractLabor)], ['12', money(e.depletion)], ['13', money(e.depreciation)],
    ['14', money(e.employeeBenefits)], ['15', money(e.insurance)], ['16a', money(e.mortgageInterest)],
    ['16b', money(e.otherInterest)], ['17', money(e.legalProfessional)], ['18', money(e.officeExpense)],
    ['19', money(e.pensionProfitSharing)], ['20a', money(e.rentVehicles)], ['20b', money(e.rentOther)],
    ['21', money(e.repairs)], ['22', money(e.supplies)], ['23', money(e.taxesLicenses)],
    ['24a', money(e.travel)], ['24b', whole(money(e.mealsTotal) * MEALS)], ['25', money(e.utilities)],
    ['26', money(e.wages)], ['27a', 0], ['27b', money(e.otherExpenses)],
  ];
  for (const [k, v] of keys) l[k] = v;
  l[28] = add(keys.map(([, v]) => v));
  l[29] = l[7] - l[28];
  l[30] = money(b.homeOffice);
  l[31] = l[29] - l[30];
  return l;
}

function schSE(net: number, ssWages: number): Lines {
  const l: Lines = {};
  l[2] = net;
  l[3] = l[2];
  l['4a'] = l[3] > 0 ? whole(l[3] * SE.factor) : l[3];
  l['4c'] = l['4a'];
  if (l['4c'] < SE.min) {
    l[6] = 0; l[12] = 0; l[13] = 0;
    return l;
  }
  l[6] = l['4c'];
  l[7] = SE.wageBase;
  l['8a'] = ssWages;
  l['8d'] = ssWages;
  l[9] = atLeast0(l[7] - l['8d']);
  l[10] = whole(Math.min(l[6], l[9]) * SE.ss);
  l[11] = whole(l[6] * SE.med);
  l[12] = l[10] + l[11];
  l[13] = whole(l[12] * SE.half);
  return l;
}

function holding(term: string | undefined, acq: string | undefined, sold: string | undefined): 'short' | 'long' {
  if (term === 'short' || term === 'long') return term;
  const a = Date.parse(acq ?? '');
  const s = Date.parse(sold ?? '');
  if (!Number.isFinite(a) || !Number.isFinite(s)) return 'short';
  return s - a > 365 * 24 * 60 * 60 * 1000 ? 'long' : 'short';
}

export function oracleCompute(raw: OracleInput): OracleResult {
  const fs = fsOf(raw.filingStatus);
  const joint = fs === 'mfj';
  const tp = raw.taxpayer ?? {};
  const sp = raw.spouse ?? {};
  const w2s = (raw.w2s ?? []).filter((w) => joint || w.owner !== 'spouse');
  const businesses = (raw.businesses ?? []).filter((b) => joint || b.owner !== 'spouse');
  const it = raw.itemized ?? {};

  const B: Lines = {};
  B[1] = add((raw.interest ?? []).map((i) => money(i.taxable)));
  B[2] = B[1];
  B[3] = 0;
  B[4] = B[2] - B[3];
  B[5] = add((raw.dividends ?? []).map((d) => money(d.ordinary)));
  B[6] = B[5];
  const taxExempt = add((raw.interest ?? []).map((i) => money(i.taxExempt)));
  const qd = add((raw.dividends ?? []).map((d) => money(d.qualified)));
  const cgd = add((raw.dividends ?? []).map((d) => money(d.capitalGainDistributions)));

  const Cs = businesses.map(schC);
  const owners = joint ? (['taxpayer', 'spouse'] as const) : (['taxpayer'] as const);
  const SEs: Lines[] = [];
  for (const o of owners) {
    const mine = businesses.map((b, i) => ({ b, l: Cs[i] })).filter((x) => (x.b.owner ?? 'taxpayer') === o);
    if (!mine.length) continue;
    const net = add(mine.map((x) => x.l[31]));
    const ss = add(w2s.filter((w) => (w.owner ?? 'taxpayer') === o).map((w) => money(w.socialSecurityWages)));
    SEs.push(schSE(net, ss));
  }
  const seTax = add(SEs.map((s) => s[12] ?? 0));
  const seDed = add(SEs.map((s) => s[13] ?? 0));

  // SE health / retirement (Pub. 535 / 560 order)
  const seByOwner = new Map<string, Lines>();
  let seIdx = 0;
  for (const o of owners) {
    const has = businesses.some((b) => (b.owner ?? 'taxpayer') === o);
    if (has) seByOwner.set(o, SEs[seIdx++]);
  }
  const adj = owners.map((o) => {
    const mineC = Cs.filter((_, i) => (businesses[i].owner ?? 'taxpayer') === o);
    if (!mineC.length) return { owner: o, health: 0, employer: 0, elective: 0 };
    const net = add(mineC.map((l) => l[31]));
    const seD = seByOwner.get(o)?.[13] ?? 0;
    if (net <= 0) return { owner: o, health: 0, employer: 0, elective: 0 };
    const person = o === 'spouse' ? sp : tp;
    const mineB = businesses.filter((b) => (b.owner ?? 'taxpayer') === o);
    const reqEl = add(mineB.map((b) => money(b.solo401kElective)));
    const reqEm = add(mineB.map((b) => money(b.sepOrSoloEmployer)));
    const reqH = raw.coveredByEmployerHealthPlan ? 0 : add(mineB.map((b) => money(b.seHealthInsurance)));
    const elCap = RET.elective + (person.age50OrOver ? RET.catchup : 0);
    const elective = Math.min(reqEl, elCap, atLeast0(net - seD));
    const comp = atLeast0(net - seD);
    const emBase = whole(Math.min(comp, RET.comp) * RET.rate);
    const employer = Math.min(reqEm, atLeast0(Math.min(emBase, RET.dc - elective)));
    const health = Math.min(reqH, atLeast0(net - seD - employer - elective));
    return { owner: o, health, employer, elective };
  });
  const seHealth = add(adj.map((a) => a.health));
  const seRet = add(adj.map((a) => a.employer + a.elective));

  // Schedule D / 8949
  const trades = (raw.capitalGains ?? []).map((t) => {
    const proceeds = money(t.proceeds);
    const cost = money(t.cost);
    return { term: holding(t.term, t.dateAcquired, t.dateSold), proceeds, cost, gain: whole(proceeds - cost) };
  });
  const D: Lines = {};
  const st = trades.filter((t) => t.term === 'short');
  const lt = trades.filter((t) => t.term === 'long');
  D['7d'] = add(st.map((t) => t.gain));
  D[6] = -money(raw.stLossCarryover);
  D[7] = D['7d'] + D[6];
  D[13] = cgd;
  D[14] = -money(raw.ltLossCarryover);
  D[15] = add(lt.map((t) => t.gain)) + D[13] + D[14];
  D[16] = D[7] + D[15];
  const lossLim = fs === 'mfs' ? CAPLOSS.mfs : CAPLOSS.lim;
  D[21] = D[16] < 0 ? -Math.min(lossLim, -D[16]) : D[16];
  const hasD = trades.length > 0 || money(raw.stLossCarryover) > 0 || money(raw.ltLossCarryover) > 0;
  const prefGain = hasD ? atLeast0(Math.min(D[15], D[16])) : cgd;

  const S1: Lines = {};
  S1[3] = add(Cs.map((l) => l[31]));
  S1[10] = S1[3];
  S1[15] = seDed;
  S1[16] = seRet;
  S1[17] = seHealth;
  S1[26] = S1[15] + S1[16] + S1[17];

  const F: Lines = {};
  F['1a'] = add(w2s.map((w) => money(w.wages)));
  F['1z'] = F['1a'];
  F['2a'] = taxExempt;
  F['2b'] = B[4];
  F['3a'] = qd;
  F['3b'] = B[6];
  // 2025 Form 1040 line 7a is capital gain or (loss). F[7] is an internal alias.
  // Line 9 = 1z + 2b + 3b + 4b + 5b + 6b + 7a + 8.
  F['4b'] = 0;
  F['5b'] = 0;
  F['6b'] = 0;
  F['7a'] = hasD ? D[21] : cgd;
  F[7] = F['7a'];
  F[8] = S1[10];
  F[9] = F['1z'] + F['2b'] + F['3b'] + F['4b'] + F['5b'] + F['6b'] + F['7a'] + F[8];
  F[10] = S1[26];
  F['11a'] = F[9] - F[10];
  F['11b'] = F['11a'];
  const agi = F['11b'];

  let boxes = (tp.bornBefore1961 ? 1 : 0) + (tp.blind ? 1 : 0);
  if (joint) boxes += (sp.bornBefore1961 ? 1 : 0) + (sp.blind ? 1 : 0);
  const perBox = fs === 'single' || fs === 'hoh' ? EXTRA_STD.unmarried : EXTRA_STD.married;
  const earnedStd = F['1z'] + S1[3] - S1[15];
  let basic = STD[fs];
  if (raw.canBeClaimedAsDependent) {
    basic = Math.min(earnedStd > 900 ? earnedStd + DEP_STD.addon : DEP_STD.min, basic);
  }
  let standardDeduction = basic + boxes * perBox;
  if (fs === 'mfs' && raw.spouseItemizes) standardDeduction = 0;

  const A: Lines = {};
  A[1] = money(it.medical);
  A[2] = agi;
  A[3] = whole(atLeast0(agi) * MED_FLOOR);
  A[4] = atLeast0(A[1] - A[3]);
  A['5a'] = money(it.stateLocalIncomeOrSalesTax);
  A['5b'] = money(it.realEstateTax);
  A['5c'] = money(it.personalPropertyTax);
  A['5d'] = A['5a'] + A['5b'] + A['5c'];
  const mfs = fs === 'mfs';
  const unlimited = mfs ? SALT.floorMfs : SALT.floor;
  if (A['5d'] <= unlimited) A['5e'] = A['5d'];
  else if (agi <= (mfs ? SALT.startMfs : SALT.start)) A['5e'] = Math.min(A['5d'], mfs ? SALT.mfsCap : SALT.cap);
  else {
    const w1 = SALT.cap;
    const w6 = atLeast0(agi - (mfs ? SALT.startMfs : SALT.start));
    const w7 = whole(w6 * SALT.rate);
    const w9 = Math.max(w1 - w7, SALT.floor);
    A['5e'] = Math.min(mfs ? whole(w9 / 2) : w9, A['5d']);
  }
  A[6] = money(it.otherTaxes);
  A[7] = A['5e'] + A[6];
  const mortRaw = money(it.mortgageInterest1098) + money(it.mortgageInterestNo1098) + money(it.pointsNo1098);
  const bal = money(it.mortgageAverageBalance);
  const mortCap = mfs ? MORT.mfs : MORT.cap;
  const mortOk = bal > 0 && mortRaw > 0 && bal > mortCap ? whole(mortRaw * (mortCap / bal)) : mortRaw;
  const scale = mortRaw > 0 ? mortOk / mortRaw : 1;
  A['8a'] = whole(money(it.mortgageInterest1098) * scale);
  A['8b'] = whole(money(it.mortgageInterestNo1098) * scale);
  A['8c'] = whole(money(it.pointsNo1098) * scale);
  A['8e'] = A['8a'] + A['8b'] + A['8c'];
  const f4952: Lines = {};
  f4952[1] = money(it.investmentInterest);
  f4952[2] = money(it.investmentInterestCarryover);
  f4952[3] = f4952[1] + f4952[2];
  f4952['4a'] = money(B[4]) + atLeast0(money(B[6]) - qd) + atLeast0(hasD ? D[7] : 0);
  f4952[5] = f4952['4a'];
  f4952[8] = Math.min(f4952[3], f4952[5]);
  A[9] = f4952[8];
  A[10] = A['8e'] + A[9];
  const cashIn = money(it.charityCash);
  const nonIn = money(it.charityNonCash);
  const carryIn = money(it.charityCarryover);
  const cashCap = whole(atLeast0(agi) * CHARITY.cash);
  const nonCap = whole(atLeast0(agi) * CHARITY.noncash);
  const allCap = whole(atLeast0(agi) * CHARITY.overall);
  const cashOk = Math.min(cashIn, cashCap);
  const nonOk = Math.min(nonIn, nonCap, atLeast0(allCap - cashOk));
  const carryUsed = Math.min(carryIn, atLeast0(allCap - cashOk - nonOk));
  A[11] = cashOk;
  A[12] = nonOk;
  A[13] = carryUsed;
  A[14] = A[11] + A[12] + A[13];
  A[15] = money(it.casualtyLoss);
  A[16] = money(it.otherItemized);
  A[17] = A[4] + A[7] + A[10] + A[14] + A[15] + A[16];
  const itemizedDeduction = A[17];
  const usesItemized = (fs === 'mfs' && !!raw.spouseItemizes) || !!raw.forceItemize || itemizedDeduction > standardDeduction;
  F['12e'] = usesItemized ? itemizedDeduction : standardDeduction;

  // Schedule 1-A
  const S1A: Lines = {};
  const tipsIn = add(w2s.map((w) => money(w.qualifiedTips))) + add(businesses.map((b) => money(b.qualifiedTips)));
  const otIn = add(w2s.map((w) => money(w.qualifiedOvertime)));
  S1A[1] = agi;
  S1A[3] = agi;
  const magi = agi;
  const ssnOk = joint ? !!(tp.hasValidSSN || sp.hasValidSSN) : !!tp.hasValidSSN;
  const tipsOk = fs !== 'mfs' && ssnOk;
  S1A[7] = tipsOk ? Math.min(money(tipsIn), TIPS.cap) : 0;
  const tipsEx = atLeast0(magi - (joint ? TIPS.startMfj : TIPS.start));
  S1A[13] = tipsEx <= 0 ? S1A[7] : atLeast0(S1A[7] - Math.floor(tipsEx / 1000) * TIPS.perK);
  const otOk = fs !== 'mfs' && ssnOk;
  S1A[15] = otOk ? Math.min(money(otIn), joint ? OT.capMfj : OT.cap) : 0;
  const otEx = atLeast0(magi - (joint ? OT.startMfj : OT.start));
  S1A[21] = otEx <= 0 ? S1A[15] : atLeast0(S1A[15] - Math.floor(otEx / 1000) * OT.perK);
  S1A[24] = Math.min(money(raw.carLoanInterest), CAR.cap);
  const carEx = atLeast0(magi - (joint ? CAR.startMfj : CAR.start));
  S1A[30] = carEx <= 0 ? S1A[24] : atLeast0(S1A[24] - Math.ceil(carEx / 1000) * CAR.perK);
  if (fs !== 'mfs') {
    const over = atLeast0(magi - (joint ? SENIOR.startMfj : SENIOR.start));
    const each = over > 0 ? atLeast0(SENIOR.amt - whole(over * SENIOR.rate)) : SENIOR.amt;
    S1A['36a'] = tp.bornBefore1961 && tp.hasValidSSN ? each : 0;
    S1A['36b'] = joint && sp.bornBefore1961 && sp.hasValidSSN ? each : 0;
    S1A[37] = S1A['36a'] + S1A['36b'];
  } else {
    S1A[37] = 0;
  }
  S1A[38] = S1A[13] + S1A[21] + S1A[30] + S1A[37];
  F['13b'] = S1A[38];

  const tiBeforeQbi = agi - F['12e'] - F['13b'];
  // QBI per business
  const items = Cs.map((l, i) => {
    const b = businesses[i];
    const o = b.owner ?? 'taxpayer';
    const seL = seByOwner.get(o);
    const ad = adj.find((a) => a.owner === o);
    const profitable = Cs.filter((x, j) => (businesses[j].owner ?? 'taxpayer') === o && x[31] > 0);
    const tot = add(profitable.map((x) => x[31]));
    const share = l[31] > 0 && tot > 0 ? l[31] / tot : 0;
    const seShare = whole((seL?.[13] ?? 0) * share);
    const hShare = whole((ad?.health ?? 0) * share);
    const rShare = whole(((ad?.employer ?? 0) + (ad?.elective ?? 0)) * share);
    return { qbi: l[31] - seShare - hShare - rShare, w2: money(b.expenses?.wages), ubia: money(b.ubia), sstb: !!b.isSstb, tips: money(b.qualifiedTips) };
  });
  const tipPool = S1A[13];
  const tipBase = add(items.map((it) => atLeast0(it.tips)));
  const afterTips = items.map((it) => {
    const share = tipBase > 0 ? atLeast0(it.tips) / tipBase : 0;
    return { ...it, qbi: it.qbi - Math.min(atLeast0(it.qbi), whole(tipPool * share)) };
  });
  const Q: Lines = {};
  Q[2] = add(afterTips.map((it) => it.qbi));
  Q[3] = -money(raw.qbiLossCarryforward);
  Q[4] = atLeast0(Q[2] + Q[3]);
  Q[5] = whole(Q[4] * QBI.rate);
  Q[10] = Q[5];
  Q[11] = tiBeforeQbi;
  Q[12] = qd + prefGain;
  Q[13] = atLeast0(Q[11] - Q[12]);
  Q[14] = whole(Q[13] * QBI.rate);
  let form8995A: Lines | null = null;
  if (!Cs.length) {
    Q[15] = 0;
  } else if (Q[11] <= QBI.th[fs]) {
    Q[15] = Math.min(Q[10], Q[14]);
  } else {
    const range = QBI.range[fs];
    const th = QBI.th[fs];
    const pct = Q[11] >= th + range ? 1 : (Q[11] - th) / range;
    const sstbPct = 1 - pct;
    let component = 0;
    const A8995: Lines = {};
    afterTips.forEach((it, i) => {
      let qbi = it.qbi;
      let w2 = it.w2;
      let ubia = it.ubia;
      if (it.sstb) {
        if (pct >= 1) { qbi = 0; w2 = 0; ubia = 0; }
        else { qbi = whole(qbi * sstbPct); w2 = whole(w2 * sstbPct); ubia = whole(ubia * sstbPct); }
      }
      const twenty = whole(atLeast0(qbi) * QBI.rate);
      const limit = Math.max(whole(w2 * 0.5), whole(w2 * 0.25 + ubia * 0.025));
      let allowed: number;
      if (pct >= 1) allowed = qbi <= 0 ? 0 : Math.min(twenty, limit);
      else allowed = atLeast0(twenty - whole(atLeast0(twenty - limit) * pct));
      A8995[`biz${i + 1}`] = allowed;
      component += allowed;
    });
    const netQbi = atLeast0(add(afterTips.map((it) => it.qbi)) - money(raw.qbiLossCarryforward));
    A8995[10] = Math.min(component, whole(netQbi * QBI.rate));
    A8995[14] = Q[14];
    A8995[15] = Math.min(A8995[10], A8995[14]);
    Q[15] = A8995[15];
    Q[10] = A8995[10];
    form8995A = A8995;
  }
  F['13a'] = Cs.length ? Q[15] : 0;
  F[14] = F['12e'] + F['13a'] + F['13b'];
  F[15] = atLeast0(F['11b'] - F[14]);
  const ti = F[15];

  let qdcgWs: Lines | null = null;
  let taxMethod: OracleResult['taxMethod'];
  if (qd > 0 || prefGain > 0) {
    qdcgWs = qdcg(ti, qd, prefGain, fs);
    F[16] = qdcgWs[25];
    taxMethod = 'qdcg-worksheet';
  } else {
    F[16] = regularTax(ti, fs);
    taxMethod = ti < TABLE_LIMIT ? 'table' : 'computation-worksheet';
  }

  // Form 6251
  const G: Lines = {};
  G['1a'] = F[14] - S1A[37];
  G['1b'] = agi - G['1a'];
  G['2a'] = usesItemized ? A[7] : (usesItemized ? 0 : F['12e']);
  const amtMed = atLeast0((usesItemized ? A[4] : 0) + whole(atLeast0(agi) * 0.075) - whole(atLeast0(agi) * AMT.med));
  G[3] = atLeast0((usesItemized ? A[4] : 0) - amtMed);
  G[4] = G['1b'] + G['2a'] + G[3];
  if (fs === 'mfs' && G[4] > AMT.mfsExtra) {
    G[4] += G[4] >= AMT.poDone.mfs ? AMT.ex.mfs : whole((G[4] - AMT.mfsExtra) * AMT.poRate);
  }
  if (G[4] >= AMT.poDone[fs]) G[5] = 0;
  else if (G[4] <= AMT.poStart[fs]) G[5] = AMT.ex[fs];
  else G[5] = atLeast0(AMT.ex[fs] - whole((G[4] - AMT.poStart[fs]) * AMT.poRate));
  G[6] = atLeast0(G[4] - G[5]);
  const amtOrd = (x: number) => {
    const cap = AMT.cap26[fs];
    if (x <= 0) return 0;
    if (x <= cap) return whole(x * 0.26);
    return whole(x * 0.28 - (fs === 'mfs' ? AMT.extra28.mfs : AMT.extra28.default));
  };
  const pref = atLeast0(qd + prefGain);
  if (pref > 0 && G[6] > 0) {
    G[12] = G[6];
    G[13] = pref;
    G[16] = Math.min(G[12], G[13]);
    G[17] = G[12] - G[16];
    G[18] = amtOrd(G[17]);
    G[19] = CG0[fs];
    G[20] = atLeast0(ti - pref);
    G[21] = atLeast0(G[19] - G[20]);
    G[22] = Math.min(G[12], G[13]);
    G[23] = Math.min(G[21], G[22]);
    G[24] = G[22] - G[23];
    G[25] = CG15[fs];
    G[29] = atLeast0(G[25] - (G[21] + G[20]));
    G[30] = Math.min(G[24], G[29]);
    G[31] = whole(G[30] * 0.15);
    G[33] = atLeast0(G[22] - (G[23] + G[30]));
    G[34] = whole(G[33] * 0.2);
    G[38] = G[18] + G[31] + G[34];
    G[39] = amtOrd(G[12]);
    G[7] = Math.min(G[38], G[39]);
  } else {
    G[7] = amtOrd(G[6]);
  }
  G[9] = G[7];
  G[10] = atLeast0(F[16]);
  G[11] = atLeast0(G[9] - G[10]);

  const S2: Lines = {};
  S2[2] = G[11];
  S2[3] = S2[2];
  F[17] = S2[3];
  F[18] = F[16] + F[17];

  const M: Lines = {};
  M[1] = add(w2s.map((w) => money(w.medicareWages)));
  M[4] = M[1];
  M[5] = ADD_MED.th[fs];
  M[6] = atLeast0(M[4] - M[5]);
  M[7] = whole(M[6] * ADD_MED.rate);
  M[8] = atLeast0(add(SEs.map((s) => s[6] ?? 0)));
  M[11] = atLeast0(M[5] - M[4]);
  M[12] = atLeast0(M[8] - M[11]);
  M[13] = whole(M[12] * ADD_MED.rate);
  M[18] = M[7] + M[13];
  M[19] = add(w2s.map((w) => money(w.medicareTax)));
  M[21] = whole(M[1] * ADD_MED.regular);
  M[22] = atLeast0(M[19] - M[21]);
  M[24] = M[22];

  const N: Lines = {};
  N[1] = F['2b'];
  N[2] = F['3b'];
  N['5a'] = hasD ? atLeast0(D[16]) : cgd;
  N[8] = N[1] + N[2] + N['5a'];
  N[12] = N[8];
  N[13] = agi;
  N[14] = NIIT.th[fs];
  N[15] = atLeast0(N[13] - N[14]);
  N[16] = Math.min(N[12], N[15]);
  N[17] = whole(atLeast0(N[16]) * NIIT.rate);

  S2[4] = seTax;
  S2[11] = M[18];
  S2[12] = N[17];
  S2[21] = S2[4] + S2[11] + S2[12];

  const eicEarned = atLeast0(F['1z'] + S1[3] - S1[15]);
  const eicInv = money(F['2b']) + money(F['3b']) + (hasD ? atLeast0(D[16]) : money(cgd));
  let eic = 0;
  const kids = (raw.dependents ?? []).filter((d) => d.eicQualifying && d.hasValidSSN).length;
  const n = Math.min(3, kids);
  const eicOk = !raw.canBeClaimedAsDependent
    && !(fs === 'mfs' && !raw.mfsLivedApart)
    && !!tp.hasValidSSN
    && (fs !== 'mfj' || !!sp.hasValidSSN)
    && !(n === 0 && (tp.bornBefore1961 || (joint && sp.bornBefore1961)))
    && eicInv <= EIC.invest
    && eicEarned > 0;
  if (eicOk) {
    // Official 2025 EIC table (separately written; not imported from the engine):
    // $50 bands; first row $1–$50; EIA-containing row prints the maximum credit;
    // leftover (starred) interval [floor50(complete−1), complete) at the cutoff.
    const jointE = fs === 'mfj';
    const start = (jointE ? EIC.phaseStart.joint : EIC.phaseStart.other)[n];
    const done = (jointE ? EIC.done.joint : EIC.done.other)[n];
    const look = (amount: number): number => {
      if (amount <= 0 || amount >= done) return 0;
      let lo = Math.floor(amount / 50) * 50;
      if (lo === 0) lo = 1;
      const naturalHi = lo === 1 ? 50 : lo + 50;
      const hi = Math.min(naturalHi, done);
      const mid = (lo + hi) / 2;
      const eia = EIC.earned[n];
      let evalAt = mid;
      if (eia >= lo && eia < hi) evalAt = Math.max(evalAt, eia);
      if (start > lo && start < hi) evalAt = Math.min(evalAt, start);
      if (evalAt <= 0 || evalAt >= done) return 0;
      const rawC = whole(Math.min(evalAt, EIC.earned[n]) * EIC.rate[n]);
      const before = Math.min(EIC.max[n], rawC);
      return atLeast0(before - whole(atLeast0(evalAt - start) * EIC.phaseRate[n]));
    };
    const byEarned = look(eicEarned);
    eic = agi === eicEarned ? byEarned : Math.min(byEarned, look(agi));
  }

  const C8812: Lines = {};
  const tpSsn = joint ? !!(tp.hasValidSSN || sp.hasValidSSN) : !!tp.hasValidSSN;
  const ctcKids = tpSsn ? (raw.dependents ?? []).filter((d) => d.under17 && d.hasValidSSN).length : 0;
  const others = (raw.dependents ?? []).length - ctcKids;
  C8812[4] = ctcKids;
  C8812[5] = ctcKids * CTC.child;
  C8812[6] = others;
  C8812[7] = others * CTC.other;
  C8812[8] = C8812[5] + C8812[7];
  C8812[9] = joint ? CTC.startMfj : CTC.startOther;
  const over = agi - C8812[9];
  C8812[10] = over > 0 ? Math.ceil(over / 1000) * 1000 : 0;
  C8812[11] = whole(C8812[10] * 0.05);
  C8812[12] = atLeast0(C8812[8] - C8812[11]);
  C8812[13] = F[18];
  C8812[14] = Math.min(C8812[12], C8812[13]);
  F[19] = C8812[14];
  C8812['16a'] = C8812[12] - C8812[14];
  C8812['16b'] = ctcKids * CTC.actc;
  C8812[17] = Math.min(C8812['16a'], C8812['16b']);
  C8812['18a'] = eicEarned;
  C8812[19] = C8812['18a'] > CTC.eiFloor ? C8812['18a'] - CTC.eiFloor : 0;
  C8812[20] = whole(C8812[19] * CTC.eiRate);
  if (C8812['16a'] <= 0 || C8812['16b'] <= 0) C8812[27] = 0;
  else if (C8812['16b'] < CTC.part2b) C8812[27] = Math.min(C8812[17], C8812[20]);
  else if (C8812[20] >= C8812[17]) C8812[27] = C8812[17];
  else {
    const ssTax = add(w2s.map((w) => money(w.socialSecurityTax)));
    const medTax = add(w2s.map((w) => money(w.medicareTax)));
    const needs = M[7] > 0 || M[13] > 0 || M[22] > 0;
    C8812[21] = needs ? ssTax + medTax + M[7] - M[22] + whole(M[13] / 2) : ssTax + medTax;
    C8812[22] = S1[15];
    C8812[25] = atLeast0(C8812[21] + C8812[22] - eic);
    C8812[26] = Math.max(C8812[20], C8812[25]);
    C8812[27] = Math.min(C8812[17], C8812[26]);
  }
  F[28] = C8812[27];

  F[20] = 0;
  F[21] = F[19] + F[20];
  F[22] = atLeast0(F[18] - F[21]);
  F[23] = S2[21];
  F[24] = F[22] + F[23];
  F['25a'] = add(w2s.map((w) => money(w.federalWithholding)));
  F['25b'] = add((raw.interest ?? []).map((i) => money(i.federalWithholding))) + add((raw.dividends ?? []).map((d) => money(d.federalWithholding)));
  F['25c'] = M[24];
  F['25d'] = F['25a'] + F['25b'] + F['25c'];
  F[26] = money(raw.estimatedPayments);
  F['27a'] = eic;
  F[29] = 0;
  F[30] = 0; // refundable adoption credit (Form 8839) — not prepared
  F[31] = 0;
  F[32] = F['27a'] + F[28] + F[29] + F[30] + F[31];
  F[33] = F['25d'] + F[26] + F[32];

  const f2210: Lines = { 19: 0 };
  if (money(raw.priorYearTax) > 0) {
    const tax = atLeast0(F[24] - F[32]);
    f2210[1] = tax;
    f2210[4] = whole(tax * EST.cy);
    const high = money(raw.priorYearAgi) > (fs === 'mfs' ? EST.highMfs : EST.high);
    f2210[8] = whole(money(raw.priorYearTax) * (high ? EST.pyHigh : EST.py));
    f2210[9] = Math.min(f2210[4], f2210[8]);
    const paid = F['25d'] + F[26];
    if (atLeast0(tax - F['25d']) < EST.floor || paid >= f2210[9] || f2210[9] <= 0) {
      f2210[19] = 0;
    } else {
      const due = whole(f2210[9] / 4);
      const each = whole(F['25d'] / 4) + whole(F[26] / 4);
      let unpaid = 0;
      let pen = 0;
      for (let i = 0; i < 4; i++) {
        unpaid = atLeast0(unpaid + due - each);
        pen += whole(unpaid * EST.rate * (EST.days[i] / 365));
      }
      f2210[19] = pen;
    }
  }
  F[38] = f2210[19];
  const overpay = F[33] - F[24];
  if (overpay > 0) {
    F[34] = overpay;
    F['35a'] = atLeast0(overpay - F[38]);
    F[37] = atLeast0(F[38] - overpay);
  } else {
    F[34] = 0;
    F['35a'] = 0;
    F[37] = -overpay + F[38];
  }

  return {
    form1040: F,
    schedule1: S1,
    schedule1A: S1A,
    schedule2: S2,
    scheduleA: A,
    scheduleB: B,
    scheduleC: Cs,
    scheduleSE: SEs,
    scheduleD: D,
    schedule8812: C8812,
    form8995: Q,
    form8995A,
    form6251: G,
    form4952: f4952,
    form2210: f2210,
    form8959: M,
    form8960: N,
    qdcgWorksheet: qdcgWs,
    standardDeduction,
    itemizedDeduction,
    usesItemized,
    taxMethod,
    refund: F['35a'],
    amountOwed: F[37],
  };
}
