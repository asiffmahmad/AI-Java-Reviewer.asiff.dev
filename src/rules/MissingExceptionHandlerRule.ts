import type { IRule } from './IRule';
import type { IJavaClass, IFinding, RuleCategory, Severity } from '../models';
import type { IReviewConfig } from '../configuration/ReviewConfig';
import { RULE_IDS } from '../utils/constants';
import type { ProjectIndex } from '../indexer/ProjectIndex';

export class MissingExceptionHandlerRule implements IRule {
  public readonly id = RULE_IDS.MISSING_EXCEPTION_HANDLER;
  public readonly name = 'Missing Exception Handler';
  public readonly category: RuleCategory = 'architecture';
  public readonly defaultSeverity: Severity = 'major';

  public static projectIndex?: ProjectIndex;

  public evaluate(javaClass: IJavaClass, _config: IReviewConfig): IFinding[] {
    const findings: IFinding[] = [];

    // Only applies to Controllers
    if (javaClass.stereotype !== 'Controller' && javaClass.stereotype !== 'RestController') {
      return findings;
    }

    // Check if the controller has a local ExceptionHandler method
    const hasLocalHandler = javaClass.methods.some((m) =>
      m.annotations.includes('ExceptionHandler')
    );
    if (hasLocalHandler) {
      return findings;
    }

    // Check if the project has a global controller advice / ExceptionHandler
    const index = MissingExceptionHandlerRule.projectIndex;
    if (index) {
      const classes = index.getAllClasses();
      const hasGlobalAdvice = classes.some((c) =>
        c.annotations.includes('ControllerAdvice') ||
        c.annotations.includes('RestControllerAdvice')
      );
      if (hasGlobalAdvice) {
        return findings;
      }
    }

    findings.push({
      ruleId: this.id,
      ruleName: this.name,
      severity: this.defaultSeverity,
      category: this.category,
      message: `Controller '${javaClass.className}' is missing a local @ExceptionHandler, and no global @ControllerAdvice was detected.`,
      recommendation: 'Create a global @RestControllerAdvice class to catch exceptions and return consistent error payloads to API clients.',
      filePath: javaClass.filePath,
      lineNumber: 1,
      scoreDeduction: 0,
      codeSnippet: `public class ${javaClass.className}`,
    });

    return findings;
  }
}
