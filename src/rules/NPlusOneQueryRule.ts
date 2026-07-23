import type { IRule } from './IRule';
import type { IJavaClass, IFinding, RuleCategory, Severity } from '../models';
import type { IReviewConfig } from '../configuration/ReviewConfig';
import { RULE_IDS } from '../utils/constants';

export class NPlusOneQueryRule implements IRule {
  public readonly id = RULE_IDS.N_PLUS_ONE_QUERY;
  public readonly name = 'Potential N+1 Database Query in Loop';
  public readonly category: RuleCategory = 'performance';
  public readonly defaultSeverity: Severity = 'major';

  public evaluate(javaClass: IJavaClass, _config: IReviewConfig): IFinding[] {
    const findings: IFinding[] = [];

    // Rule applies to Services and Repositories
    if (javaClass.stereotype !== 'Service' && javaClass.stereotype !== 'Repository' && javaClass.stereotype !== 'Component') {
      return findings;
    }

    for (const method of javaClass.methods) {
      if (!method.body) continue;

      // Detect loops containing repository calls e.g., for (...) { userRepo.findById(id); }
      const loopMatch = /(?:for|while)\s*\([^)]*\)\s*\{[^}]*\b[a-zA-Z0-9_]*(?:Repository|repo|Dao|dao|Service|service)[a-zA-Z0-9_]*\.[a-zA-Z0-9_]+\s*\([^)]*\)/i.test(method.body);
      const streamMatch = /\.forEach\s*\([^)]*\b[a-zA-Z0-9_]*(?:Repository|repo|Dao|dao|Service|service)[a-zA-Z0-9_]*\.[a-zA-Z0-9_]+/i.test(method.body);

      if (loopMatch || streamMatch) {
        findings.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: this.defaultSeverity,
          category: this.category,
          message: `Method '${method.name}' invokes repository queries inside a loop or stream forEach.`,
          recommendation: 'Refactor to bulk database fetch queries (e.g. findAllById, @EntityGraph, JOIN FETCH) to eliminate N+1 queries.',
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
