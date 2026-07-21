import type { IJavaClass, IFinding, RuleCategory, Severity } from '../models';
import type { IReviewConfig } from '../configuration/ReviewConfig';

/**
 * Base interface for all deterministic rules.
 */
export interface IRule {
  readonly id: string;
  readonly name: string;
  readonly category: RuleCategory;
  readonly defaultSeverity: Severity;

  /**
   * Evaluates the given Java class against this rule.
   *
   * @param javaClass The parsed Java class representation.
   * @param config The active project configuration.
   * @returns An array of findings (empty if no violations).
   */
  evaluate(javaClass: IJavaClass, config: IReviewConfig): IFinding[];
}
