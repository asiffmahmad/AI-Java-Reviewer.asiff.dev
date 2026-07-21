import type { IRule } from './IRule';
import type { IJavaClass, IFinding, RuleCategory, Severity } from '../models';
import type { IReviewConfig } from '../configuration/ReviewConfig';
import { RULE_IDS } from '../utils/constants';

export class FieldInjectionRule implements IRule {
  public readonly id = RULE_IDS.FIELD_INJECTION;
  public readonly name = 'Avoid Field Injection';
  public readonly category: RuleCategory = 'architecture';
  public readonly defaultSeverity: Severity = 'major';

  public evaluate(javaClass: IJavaClass, _config: IReviewConfig): IFinding[] {
    const findings: IFinding[] = [];

    // Only applies to Spring components
    if (javaClass.stereotype === 'none') {
      return findings;
    }

    for (const field of javaClass.fields) {
      if (field.injectionType === 'field') {
        findings.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: this.defaultSeverity,
          category: this.category,
          message: `Field injection used for '${field.name}'.`,
          recommendation: 'Use constructor injection instead to ensure dependencies are not null, facilitate unit testing, and enforce immutability.',
          filePath: javaClass.filePath,
          lineNumber: field.lineNumber,
          scoreDeduction: 0, // Assigned by RuleEngine
          codeSnippet: field.rawSource,
        });
      }
    }

    return findings;
  }
}
