import type { IRule } from './IRule';
import type { IJavaClass, IFinding, RuleCategory, Severity } from '../models';
import type { IReviewConfig } from '../configuration/ReviewConfig';
import { RULE_IDS } from '../utils/constants';

export class MissingValidationRule implements IRule {
  public readonly id = RULE_IDS.MISSING_VALID;
  public readonly name = 'Missing @Valid Annotation on Request Body';
  public readonly category: RuleCategory = 'quality';
  public readonly defaultSeverity: Severity = 'major';

  public evaluate(javaClass: IJavaClass, _config: IReviewConfig): IFinding[] {
    const findings: IFinding[] = [];

    if (javaClass.stereotype !== 'Controller' && javaClass.stereotype !== 'RestController') {
      return findings;
    }

    for (const method of javaClass.methods) {
      for (const param of method.parameters) {
        const hasRequestBody = param.annotations.includes('RequestBody');
        const hasValid = param.annotations.includes('Valid') || param.annotations.includes('Validated');

        if (hasRequestBody && !hasValid) {
          findings.push({
            ruleId: this.id,
            ruleName: this.name,
            severity: this.defaultSeverity,
            category: this.category,
            message: `Endpoint parameter '${param.name}' is annotated with @RequestBody but missing @Valid.`,
            recommendation: 'Add @Valid or @Validated annotation to enforce automatic Bean Validation on incoming JSON payloads.',
            filePath: javaClass.filePath,
            lineNumber: method.lineNumber,
            scoreDeduction: 0,
            codeSnippet: `${method.name}(@RequestBody ${param.type} ${param.name})`,
          });
        }
      }
    }

    return findings;
  }
}
