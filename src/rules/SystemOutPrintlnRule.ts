import type { IRule } from './IRule';
import type { IJavaClass, IFinding, RuleCategory, Severity } from '../models';
import type { IReviewConfig } from '../configuration/ReviewConfig';
import { RULE_IDS } from '../utils/constants';

export class SystemOutPrintlnRule implements IRule {
  public readonly id = RULE_IDS.SYSTEM_OUT_PRINTLN;
  public readonly name = 'Avoid System.out.println';
  public readonly category: RuleCategory = 'quality';
  public readonly defaultSeverity: Severity = 'minor';

  public evaluate(javaClass: IJavaClass, _config: IReviewConfig): IFinding[] {
    const findings: IFinding[] = [];

    for (const method of javaClass.methods) {
      if (method.body.includes('System.out.println') || method.body.includes('System.err.println')) {
        findings.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: this.defaultSeverity,
          category: this.category,
          message: `Method '${method.name}' uses standard output for logging.`,
          recommendation: 'Use a proper logging framework (e.g. SLF4J, Logback) instead of standard output for better log management.',
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
