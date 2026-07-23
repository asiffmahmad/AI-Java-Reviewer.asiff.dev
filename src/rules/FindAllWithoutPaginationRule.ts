import type { IRule } from './IRule';
import type { IJavaClass, IFinding, RuleCategory, Severity } from '../models';
import type { IReviewConfig } from '../configuration/ReviewConfig';
import { RULE_IDS } from '../utils/constants';

export class FindAllWithoutPaginationRule implements IRule {
  public readonly id = RULE_IDS.FIND_ALL_WITHOUT_PAGINATION;
  public readonly name = 'Unpaginated findAll Database Call';
  public readonly category: RuleCategory = 'performance';
  public readonly defaultSeverity: Severity = 'major';

  public evaluate(javaClass: IJavaClass, _config: IReviewConfig): IFinding[] {
    const findings: IFinding[] = [];

    for (const method of javaClass.methods) {
      if (!method.body) continue;

      const hasFindAllCall = /\.findAll\s*\(\s*\)/.test(method.body);
      if (hasFindAllCall) {
        findings.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: this.defaultSeverity,
          category: this.category,
          message: `Method '${method.name}' invokes unpaginated findAll() database call.`,
          recommendation: 'Use Pageable parameter in repository queries (findAll(Pageable pageable)) to prevent out-of-memory errors on large datasets.',
          filePath: javaClass.filePath,
          lineNumber: method.lineNumber,
          scoreDeduction: 0,
          codeSnippet: `${method.returnType} ${method.name}(...)`,
        });
      }
    }

    return findings;
  }
}
