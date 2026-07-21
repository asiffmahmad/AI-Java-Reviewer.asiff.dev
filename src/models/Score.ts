/**
 * A single score deduction applied for a specific rule violation.
 */
export interface IScoreDeduction {
  readonly ruleId: string;
  readonly amount: number;
  readonly reason: string;
  readonly filePath: string;
}

/**
 * Score for a single quality dimension (architecture, security, etc.).
 * Starts at maxScore (100) and deductions are subtracted per finding.
 */
export interface ICategoryScore {
  readonly category: string;
  /** Computed score after deductions, clamped to [0, maxScore] */
  readonly score: number;
  readonly maxScore: number;
  /** Percentage, 0–100 */
  readonly percentage: number;
  readonly deductions: IScoreDeduction[];
}

/**
 * Letter grade derived from the final weighted score.
 */
export type ScoreGrade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Aggregated project score.
 * All scores are computed deterministically by the ScoreCalculator,
 * not invented by AI.
 */
export interface IProjectScore {
  readonly architecture: ICategoryScore;
  readonly security: ICategoryScore;
  readonly performance: ICategoryScore;
  readonly maintainability: ICategoryScore;
  readonly testing: ICategoryScore;
  /**
   * Weighted final score 0–100.
   * Weights: architecture 25%, security 25%, performance 20%,
   *          maintainability 20%, testing 10%
   */
  readonly finalScore: number;
  readonly grade: ScoreGrade;
}
