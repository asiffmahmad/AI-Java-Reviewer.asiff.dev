import type { IRule } from './IRule';
import type { IJavaClass, IFinding, RuleCategory, Severity } from '../models';
import type { IReviewConfig } from '../configuration/ReviewConfig';
import { RULE_IDS } from '../utils/constants';

export class MissingTransactionalRule implements IRule {
  public readonly id = RULE_IDS.MISSING_TRANSACTIONAL;
  public readonly name = 'Missing @Transactional on Write Operations';
  public readonly category: RuleCategory = 'architecture';
  public readonly defaultSeverity: Severity = 'major';

  // Basic heuristics for write methods
  private readonly writePrefixes = ['save', 'update', 'delete', 'create', 'insert', 'add', 'remove'];

  public evaluate(javaClass: IJavaClass, _config: IReviewConfig): IFinding[] {
    const findings: IFinding[] = [];

    // Rule only applies to Services
    if (javaClass.stereotype !== 'Service') {
      return findings;
    }

    const hasClassLevelTransactional = javaClass.annotations.includes('Transactional');
    
    for (const method of javaClass.methods) {
      if (!method.annotations.includes('Transactional') && !hasClassLevelTransactional) {
        if (this.isWriteMethod(method.name)) {
          findings.push({
            ruleId: this.id,
            ruleName: this.name,
            severity: this.defaultSeverity,
            category: this.category,
            message: `Method '${method.name}' performs a write operation but is missing @Transactional.`,
            recommendation: 'Add @Transactional to ensure data consistency and enable rollback on exceptions.',
            filePath: javaClass.filePath,
            lineNumber: method.lineNumber,
            scoreDeduction: 0,
            codeSnippet: `${method.returnType} ${method.name}(...)`,
          });
        }
      }
    }

    return findings;
  }

  private isWriteMethod(name: string): boolean {
    const lower = name.toLowerCase();
    return this.writePrefixes.some(prefix => lower.startsWith(prefix));
  }
}
