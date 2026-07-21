import type { IJavaClass, IFinding } from '../models';
import type { IReviewConfig } from '../configuration/ReviewConfig';
import type { IRule } from './IRule';
import { DEFAULT_SCORE_DEDUCTIONS } from '../utils/constants';

export class RuleEngine {
  private readonly rules: IRule[] = [];

  public registerRule(rule: IRule): void {
    this.rules.push(rule);
  }

  public registerRules(rules: IRule[]): void {
    this.rules.push(...rules);
  }

  /**
   * Evaluates all registered rules against a set of Java classes.
   * Returns a flattened array of findings.
   */
  public evaluate(classes: IJavaClass[], config: IReviewConfig): IFinding[] {
    const findings: IFinding[] = [];

    for (const javaClass of classes) {
      for (const rule of this.rules) {
        // Check if the rule is disabled in config
        const override = config.ruleOverrides.find(o => o.id === rule.id);
        if (override && !override.enabled) {
          continue;
        }

        const ruleFindings = rule.evaluate(javaClass, config);
        
        for (const finding of ruleFindings) {
          // Apply overrides for severity and score deduction if configured
          const severity = override?.severity ?? rule.defaultSeverity;
          const scoreDeduction = override?.scoreDeduction ?? DEFAULT_SCORE_DEDUCTIONS[rule.id] ?? 0;

          findings.push({
            ...finding,
            severity,
            scoreDeduction,
          });
        }
      }
    }

    return findings;
  }
}
