import type { Severity } from './Finding';

/**
 * Per-rule override from .reviewai.yml — allows disabling or adjusting
 * individual rules without touching source code.
 */
export interface IRuleConfig {
  /** Rule identifier matching the rule's static RULE_ID constant */
  readonly id: string;
  readonly enabled: boolean;
  /** Override the default severity for this rule */
  readonly severity?: Severity;
  /** Override the default score deduction for this rule */
  readonly scoreDeduction?: number;
}
