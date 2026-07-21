import type { IProjectSummary } from './ProjectSummary';

/**
 * The final deliverable of a complete AI review run.
 * Combines deterministic project analysis with generated report paths.
 */
export interface IReviewReport {
  /** UUID v4 generated at report creation time */
  readonly id: string;
  readonly projectSummary: IProjectSummary;
  /** Absolute path to the generated Markdown report */
  readonly markdownPath: string;
  /** Absolute path to the generated JSON report */
  readonly jsonPath: string;
  readonly generatedAt: Date;
  /** Provider name used for AI explanations, e.g. "openai" */
  readonly providerUsed: string;
  /** Model identifier used, e.g. "gpt-4o" */
  readonly modelUsed: string;
  /** Total wall-clock time for the complete review pipeline in ms */
  readonly reviewDurationMs: number;
}
