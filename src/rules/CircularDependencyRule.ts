import type { IRule } from './IRule';
import type { IJavaClass, IFinding, RuleCategory, Severity } from '../models';
import type { IReviewConfig } from '../configuration/ReviewConfig';
import { RULE_IDS } from '../utils/constants';
import type { ProjectIndex } from '../indexer/ProjectIndex';

export class CircularDependencyRule implements IRule {
  public readonly id = RULE_IDS.CIRCULAR_DEPENDENCY;
  public readonly name = 'Circular Dependency Detected';
  public readonly category: RuleCategory = 'architecture';
  public readonly defaultSeverity: Severity = 'major';

  public static projectIndex?: ProjectIndex;

  public evaluate(javaClass: IJavaClass, _config: IReviewConfig): IFinding[] {
    const findings: IFinding[] = [];
    const index = CircularDependencyRule.projectIndex;
    if (!index) return findings;

    const fqn = javaClass.fullyQualifiedName || javaClass.className;

    // Resolve dependencies of the current class (by looking at imported classes or field types)
    const dependencies = new Set<string>();
    for (const field of javaClass.fields) {
      const fieldClass = index.getClass(field.type);
      if (fieldClass) {
        dependencies.add(fieldClass.fullyQualifiedName || fieldClass.className);
      }
    }

    for (const dep of dependencies) {
      if (dep === fqn) continue;

      // Check if the dependency class depends back on the current class
      const depClass = index.getClass(dep);
      if (depClass) {
        const depDependencies = new Set<string>();
        for (const depField of depClass.fields) {
          const depFieldClass = index.getClass(depField.type);
          if (depFieldClass) {
            depDependencies.add(depFieldClass.fullyQualifiedName || depFieldClass.className);
          }
        }

        if (depDependencies.has(fqn)) {
          findings.push({
            ruleId: this.id,
            ruleName: this.name,
            severity: this.defaultSeverity,
            category: this.category,
            message: `Circular dependency detected between '${javaClass.className}' and '${depClass.className}'.`,
            recommendation: 'Break the circular dependency by introducing a shared interface, refactoring common logic to a third helper class, or using lazy injection.',
            filePath: javaClass.filePath,
            lineNumber: 1,
            scoreDeduction: 0,
            codeSnippet: `class ${javaClass.className} <-> class ${depClass.className}`,
          });
        }
      }
    }

    return findings;
  }
}
