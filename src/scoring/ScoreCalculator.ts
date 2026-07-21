import type { IProjectScore, ICategoryScore, ScoreGrade, IFinding } from '../models';
import { SCORE_WEIGHTS } from '../utils/constants';

export class ScoreCalculator {
  /**
   * Calculates the project score based on deterministic rule findings.
   * Starts with 100 in each category and subtracts the finding's scoreDeduction.
   */
  public calculate(findings: IFinding[]): IProjectScore {
    const categories: Record<string, ICategoryScore> = {
      architecture: this.createEmptyCategory('architecture'),
      security: this.createEmptyCategory('security'),
      performance: this.createEmptyCategory('performance'),
      maintainability: this.createEmptyCategory('maintainability'),
      testing: this.createEmptyCategory('testing'),
    };

    // Apply deductions
    for (const finding of findings) {
      if (finding.scoreDeduction > 0) {
        const targetCategory = this.mapRuleCategoryToScoreCategory(finding.category);
        const categoryData = categories[targetCategory];
        
        if (categoryData) {
          categoryData.deductions.push({
            ruleId: finding.ruleId,
            amount: finding.scoreDeduction,
            reason: finding.message,
            filePath: finding.filePath,
          });
          // Note: score will be computed afterwards
        }
      }
    }

    // Finalize each category
    let finalRawScore = 0;
    for (const key of Object.keys(categories)) {
      const cat = categories[key];
      const totalDeductions = cat.deductions.reduce((sum, d) => sum + d.amount, 0);
      const computedScore = Math.max(0, cat.maxScore - totalDeductions);
      const percentage = (computedScore / cat.maxScore) * 100;
      
      const updatedCategory: ICategoryScore = {
        ...cat,
        score: computedScore,
        percentage,
      };
      categories[key] = updatedCategory;

      const weight = SCORE_WEIGHTS[key as keyof typeof SCORE_WEIGHTS] ?? 0;
      finalRawScore += percentage * weight;
    }

    return {
      architecture: categories['architecture'],
      security: categories['security'],
      performance: categories['performance'],
      maintainability: categories['maintainability'],
      testing: categories['testing'],
      finalScore: Number(finalRawScore.toFixed(2)),
      grade: this.getGrade(finalRawScore),
    };
  }

  private createEmptyCategory(category: string): ICategoryScore {
    return {
      category,
      score: 100,
      maxScore: 100,
      percentage: 100,
      deductions: [],
    };
  }

  private mapRuleCategoryToScoreCategory(ruleCategory: string): string {
    switch (ruleCategory) {
      case 'design':
      case 'quality':
        return 'maintainability';
      case 'resilience':
        return 'architecture';
      default:
        return ruleCategory; // Matches directly (security -> security)
    }
  }

  private getGrade(score: number): ScoreGrade {
    if (score >= 90) { return 'A'; }
    if (score >= 80) { return 'B'; }
    if (score >= 70) { return 'C'; }
    if (score >= 60) { return 'D'; }
    return 'F';
  }
}
