// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * TY2025 annual-parameter pack — the single source for dollar figures,
 * citations, indexing, sunset, and verification flags going forward.
 *
 * Do not hard-code a new 2025 annual amount in constants2025.ts unless it
 * also appears here (or is a derived figure with a registry note).
 */
import type { Rule, VerifiedFlag } from './types';
import raw from './ty2025-parameters.json';

export interface PackParameter {
  value: unknown;
  source_url: string;
  indexing: string;
  sunset: string;
  verified: boolean;
  citation: string;
  note?: string;
  also_confirmed_in?: string[];
}

export interface Ty2025Pack {
  _meta: {
    title: string;
    tax_year: number;
    prepared: string;
    law_through: string;
    convention: string;
  };
  parameters: Record<string, PackParameter>;
}

export const TY2025_PACK = raw as Ty2025Pack;
export const TY2025_PARAMETERS = TY2025_PACK.parameters;

/** Keys the current pack marks verified=false. Empty after the close-out pass. */
export const UNVERIFIED_PACK_KEYS = Object.entries(TY2025_PARAMETERS)
  .filter(([, p]) => !p.verified)
  .map(([k]) => k);

/** Reserved for a future pass that marks a confirmed-but-incomplete figure. */
export const PARTIAL_PACK_KEYS: string[] = [];

export function packParam(key: string): PackParameter {
  const p = TY2025_PARAMETERS[key];
  if (!p) throw new Error(`TY2025 pack is missing parameter "${key}"`);
  return p;
}

export function verifiedFlag(key: string): VerifiedFlag {
  const p = packParam(key);
  if (!p.verified) return false;
  if (PARTIAL_PACK_KEYS.includes(key)) return 'partial';
  return true;
}

export function packMeta(key: string): {
  parameterKey: string;
  sourceUrl: string;
  indexing: string;
  sunset: string;
  verified: VerifiedFlag;
  unverifiedNote?: string;
} {
  const p = packParam(key);
  return {
    parameterKey: key,
    sourceUrl: p.source_url,
    indexing: p.indexing,
    sunset: p.sunset,
    verified: verifiedFlag(key),
    unverifiedNote: p.note,
  };
}

/** Annual (and annual-valued) registry ids → pack parameter key. */
export const ANNUAL_RULE_PACK_KEY: Record<string, string> = {
  'brackets-ordinary': 'brackets.single',
  'tax-table-limit': 'brackets.single',
  'cg-zero-rate': 'capital_gains.single',
  'cg-fifteen-rate': 'capital_gains.single',
  'std-deduction': 'standard_deduction.basic',
  'additional-std': 'standard_deduction.additional_aged_blind',
  'dependent-std-worksheet': 'standard_deduction.dependent',
  'salt-cap': 'salt.cap',
  'salt-worksheet': 'salt.cap',
  's1a-tips': 'obbba.tips',
  's1a-overtime': 'obbba.overtime',
  's1a-car-loan': 'obbba.car_loan_interest',
  's1a-senior': 'obbba.senior_deduction',
  'senior-deduction': 'obbba.senior_deduction',
  'qbi-8995': 'qbi.threshold',
  'qbi-8995a-w2-ubia': 'qbi.phase_in_range',
  'amt-exemption': 'amt.exemption',
  'se-tax': 'social_security.wage_base',
  'se-retirement': 'retirement.401k_elective_deferral',
  'ctc-amounts': 'ctc.phaseout_threshold',
  'eic-params': 'eic.children_0',
  'eic-investment-limit': 'eic.investment_income_limit',
  'form-2210': 'estimated_tax.safe_harbors',
  'additional-medicare': 'additional_medicare.threshold',
  'niit': 'niit.threshold',
  odc: 'odc.per_dependent',
  'roth-phaseout': 'roth.contribution_phaseout',
  'section-179': 'section179',
  'kiddie-tax': 'kiddie_tax.form8615_threshold',
  'adoption-credit': 'adoption_credit',
  'ptc-8962': 'ptc.applicable_percentage_table',
  'mileage-2025': 'mileage',
  'qualifying-relative': 'qualifying_relative_gross_income',
};

export function applyPackMetadata(rules: Rule[]): Rule[] {
  return rules.map((r) => {
    const key = ANNUAL_RULE_PACK_KEY[r.id];
    if (!key) return r;
    const meta = packMeta(key);
    return { ...r, ...meta };
  });
}

export function flaggedRules(rules: Rule[]): Rule[] {
  return rules.filter((r) => r.verified === false || r.verified === 'partial');
}
