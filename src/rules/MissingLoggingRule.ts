import type { IRule } from './IRule';
import type { IJavaClass, IFinding, RuleCategory, Severity } from '../models';
import type { IReviewConfig } from '../configuration/ReviewConfig';
import { RULE_IDS } from '../utils/constants';

export class MissingLoggingRule implements IRule {
  public readonly id = RULE_IDS.MISSING_LOGGING;
  public readonly name = 'Missing Proper Logging Framework';
  public readonly category: RuleCategory = 'quality';
  public readonly defaultSeverity: Severity = 'minor';

  public evaluate(javaClass: IJavaClass, _config: IReviewConfig): IFinding[] {
    const findings: IFinding[] = [];

    // Service, Controller, and Repository components should have logging configured
    if (javaClass.stereotype === 'none') {
      return findings;
    }

    const hasSlf4j = javaClass.annotations.includes('Slf4j') || javaClass.annotations.includes('Log4j2');
    const hasLoggerField = javaClass.fields.some(
      (f) => f.type === 'Logger' || f.type === 'org.slf4j.Logger' || f.name.toLowerCase() === 'log'
    );

    if (!hasSlf4j && !hasLoggerField) {
      findings.push({
        ruleId: this.id,
        ruleName: this.name,
        severity: this.defaultSeverity,
        category: this.category,
        message: `Spring component '${javaClass.className}' is missing a logger framework or SLF4J annotation.`,
        recommendation: 'Annotate the class with @Slf4j or declare a Logger instance to enable structured enterprise logging.',
        filePath: javaClass.filePath,
        lineNumber: 1,
        scoreDeduction: 0,
        codeSnippet: `public class ${javaClass.className}`,
      });
    }

    return findings;
  }
}
