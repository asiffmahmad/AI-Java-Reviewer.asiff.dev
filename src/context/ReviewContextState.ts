import type { IFinding, IProjectScore, IConfiguredRule } from '../models';
import type { IReviewConfig } from '../configuration/ReviewConfig';

export interface IToolCallRecord {
  readonly toolName: string;
  readonly args: Record<string, any>;
  readonly timestamp: number;
}

export class ReviewContextState {
  public readonly visitedFiles = new Set<string>();
  public readonly visitedMethods = new Set<string>();
  public readonly retrievedRuleIds = new Set<string>();
  public readonly toolHistory: IToolCallRecord[] = [];

  public findings?: IFinding[];
  public score?: IProjectScore;
  public dependencies?: string[];
  public config?: IReviewConfig;
  public workspaceRoot?: string;
  public configuredRules?: IConfiguredRule[];

  constructor(options?: {
    findings?: IFinding[];
    score?: IProjectScore;
    dependencies?: string[];
    config?: IReviewConfig;
    workspaceRoot?: string;
    configuredRules?: IConfiguredRule[];
  }) {
    if (options) {
      this.findings = options.findings;
      this.score = options.score;
      this.dependencies = options.dependencies;
      this.config = options.config;
      this.workspaceRoot = options.workspaceRoot;
      this.configuredRules = options.configuredRules;
    }
  }

  public markFileVisited(filePath: string): void {
    if (filePath) {
      this.visitedFiles.add(filePath);
    }
  }

  public markMethodVisited(className: string, methodName: string): void {
    if (className && methodName) {
      this.visitedMethods.add(`${className}.${methodName}`);
    }
  }

  public markRuleRetrieved(ruleId: string): void {
    if (ruleId) {
      this.retrievedRuleIds.add(ruleId);
    }
  }

  public recordToolExecution(toolName: string, args: Record<string, any>): void {
    this.toolHistory.push({
      toolName,
      args,
      timestamp: Date.now(),
    });
  }

  public hasExecutedTool(toolName: string, argsKey?: string): boolean {
    if (!argsKey) {
      return this.toolHistory.some((t) => t.toolName === toolName);
    }
    return this.toolHistory.some((t) => t.toolName === toolName && JSON.stringify(t.args) === argsKey);
  }

  public getVisitedSummary(): { totalVisitedFiles: number; totalVisitedMethods: number; totalToolCalls: number } {
    return {
      totalVisitedFiles: this.visitedFiles.size,
      totalVisitedMethods: this.visitedMethods.size,
      totalToolCalls: this.toolHistory.length,
    };
  }
}
