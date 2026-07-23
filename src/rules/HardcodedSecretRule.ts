import type { IRule } from './IRule';
import type { IJavaClass, IFinding, RuleCategory, Severity } from '../models';
import type { IReviewConfig } from '../configuration/ReviewConfig';
import { RULE_IDS } from '../utils/constants';

export class HardcodedSecretRule implements IRule {
  public readonly id = RULE_IDS.HARDCODED_SECRET;
  public readonly name = 'Hardcoded Secret or Credential Detected';
  public readonly category: RuleCategory = 'security';
  public readonly defaultSeverity: Severity = 'critical';

  private readonly secretRegexes = [
    /(?:password|passwd|secret|api[_-]?key|access[_-]?key|auth[_-]?token|bearer[_-]?token|private[_-]?key)\s*[:=]\s*["']([^"'\s]{4,})["']/i,
    /["'](AKIA[0-9A-Z]{16})["']/,
    /["'](ghp_[a-zA-Z0-9]{36})["']/,
    /["'](sk-[a-zA-Z0-9]{32,})["']/,
  ];

  public evaluate(javaClass: IJavaClass, _config: IReviewConfig): IFinding[] {
    const findings: IFinding[] = [];

    for (const field of javaClass.fields) {
      for (const regex of this.secretRegexes) {
        if (regex.test(field.rawSource)) {
          findings.push({
            ruleId: this.id,
            ruleName: this.name,
            severity: this.defaultSeverity,
            category: this.category,
            message: `Field '${field.name}' contains a hardcoded credential or secret string.`,
            recommendation: 'Externalize credentials using environment variables, Spring @Value, or HashiCorp Vault.',
            filePath: javaClass.filePath,
            lineNumber: field.lineNumber,
            scoreDeduction: 0,
            codeSnippet: field.rawSource,
          });
          break;
        }
      }
    }

    for (const method of javaClass.methods) {
      if (!method.body) continue;
      for (const regex of this.secretRegexes) {
        if (regex.test(method.body)) {
          findings.push({
            ruleId: this.id,
            ruleName: this.name,
            severity: this.defaultSeverity,
            category: this.category,
            message: `Method '${method.name}' contains hardcoded secret literals.`,
            recommendation: 'Store secrets in external environment variables or secure secret managers.',
            filePath: javaClass.filePath,
            lineNumber: method.lineNumber,
            scoreDeduction: 0,
            codeSnippet: `${method.returnType} ${method.name}(...)`,
          });
          break;
        }
      }
    }

    return findings;
  }
}
