/**
 * Severity level of a Rule Engine finding.
 *
 * critical  → immediate action required, blocks release
 * major     → must be fixed before production
 * minor     → should be fixed, technical debt
 * suggestion → improvement opportunity, no deduction
 */
export type Severity = 'critical' | 'major' | 'minor' | 'suggestion';

/**
 * Broad category for grouping findings in the report.
 */
export type RuleCategory =
  | 'security'
  | 'architecture'
  | 'performance'
  | 'design'
  | 'quality'
  | 'resilience'
  | 'testing';

/**
 * A single issue detected deterministically by the Rule Engine.
 * AI never produces findings — it only receives them as context and explains them.
 */
export interface IFinding {
  /** Unique rule identifier, e.g. "RULE_FIELD_INJECTION" */
  readonly ruleId: string;
  /** Human-readable rule name */
  readonly ruleName: string;
  readonly severity: Severity;
  readonly category: RuleCategory;
  /** Detailed message describing the exact issue found */
  readonly message: string;
  /** Built-in remediation guidance (deterministic) */
  readonly recommendation: string;
  /** Absolute path to the Java file containing the issue */
  readonly filePath: string;
  /** 1-indexed line where the issue was detected */
  readonly lineNumber: number;
  /** Points deducted from the relevant score category */
  readonly scoreDeduction: number;
  /** Short code excerpt showing the problematic code */
  readonly codeSnippet?: string;
  /** AI-generated explanation added after the AI processing step */
  aiExplanation?: IAIExplanation;
}

/**
 * AI-generated explanation for a finding, added after the AI processing step.
 * Stored on the finding so JSON/Markdown generators can inline it.
 */
export interface IAIExplanation {
  readonly explanation: string;
  readonly priorityReasoning: string;
  readonly recommendedFix: string;
  /** Optional before/after code example produced by the AI */
  readonly codeExample?: string;
}
