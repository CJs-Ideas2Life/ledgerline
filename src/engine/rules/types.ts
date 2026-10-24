// SPDX-License-Identifier: AGPL-3.0-or-later
export type RuleClass = 'stable' | 'annual';

/** true = read from the cited URL this pass; false = UNVERIFIED; partial = confirmed in one source but not re-read / derived. */
export type VerifiedFlag = true | false | 'partial';

export type CitationKind =
  | 'irc'
  | 'treas-reg'
  | 'rev-proc'
  | 'obbba'
  | 'form'
  | 'instructions'
  | 'notice'
  | 'pub'
  | 'irb';

export interface Citation {
  kind: CitationKind;
  /** Human-readable pin, e.g. "Rev. Proc. 2024-40 § 3.01 Table 3" or "Form 1040 line 12e". */
  ref: string;
  url?: string;
}

export interface Rule {
  id: string;
  topic: string;
  form: string;
  formLine: string;
  rule: string;
  reason: string;
  citations: Citation[];
  classification: RuleClass;
  /** 2025 parameter, when the rule is annual or has a 2025 dollar figure. */
  value2025?: string;
  /** Exported name(s) in constants2025.ts this rule is the citation for. */
  constants?: string[];
  simplification?: string;
  /** Result paths this rule explains, e.g. "form1040.12e". */
  appliesTo: string[];
  /** Key in ty2025-parameters.json for annual figures. */
  parameterKey?: string;
  sourceUrl?: string;
  indexing?: string;
  sunset?: string;
  verified?: VerifiedFlag;
  unverifiedNote?: string;
}

export interface TraceStep {
  form: string;
  line: string;
  label: string;
  amount: number;
  ruleIds: string[];
  note?: string;
}
