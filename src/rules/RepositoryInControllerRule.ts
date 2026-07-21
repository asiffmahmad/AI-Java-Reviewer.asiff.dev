import type { IRule } from './IRule';
import type { IJavaClass, IFinding, RuleCategory, Severity } from '../models';
import type { IReviewConfig } from '../configuration/ReviewConfig';
import { RULE_IDS } from '../utils/constants';

export class RepositoryInControllerRule implements IRule {
  public readonly id = RULE_IDS.REPOSITORY_IN_CONTROLLER;
  public readonly name = 'Avoid Repositories in Controllers';
  public readonly category: RuleCategory = 'architecture';
  public readonly defaultSeverity: Severity = 'major';

  public evaluate(javaClass: IJavaClass, _config: IReviewConfig): IFinding[] {
    const findings: IFinding[] = [];

    if (javaClass.stereotype !== 'Controller' && javaClass.stereotype !== 'RestController') {
      return findings;
    }

    for (const field of javaClass.fields) {
      if (field.type.includes('Repository')) {
        findings.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: this.defaultSeverity,
          category: this.category,
          message: `Controller '${javaClass.className}' directly depends on '${field.type}'.`,
          recommendation: 'Inject repositories into Service classes, and have Controllers depend on Services. This separates business logic from routing.',
          filePath: javaClass.filePath,
          lineNumber: field.lineNumber,
          scoreDeduction: 0,
          codeSnippet: field.rawSource,
        });
      }
    }

    return findings;
  }
}
