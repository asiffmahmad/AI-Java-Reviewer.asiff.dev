import type { IFinding } from './Finding';
import type { IProjectScore } from './Score';

/**
 * Aggregated statistical and analytical summary of the entire Java project.
 * Built from all parsed JavaClass objects and Rule Engine findings.
 * Passed to the PromptBuilder as project-level context.
 */
export interface IProjectSummary {
  readonly projectName: string;
  readonly javaVersion: string;
  readonly framework: string;
  /** Total number of .java files discovered */
  readonly totalFiles: number;
  readonly totalClasses: number;
  readonly controllers: number;
  readonly services: number;
  readonly repositories: number;
  readonly components: number;
  readonly configurations: number;
  readonly testFiles: number;
  /** Distinct package names found in the project */
  readonly packageNames: string[];
  /** Dependency names parsed from pom.xml or build.gradle */
  readonly dependencies: string[];
  /** All findings from the Rule Engine, in severity order */
  readonly findings: IFinding[];
  readonly score: IProjectScore;
  readonly generatedAt: Date;
}
