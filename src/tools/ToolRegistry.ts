import type { ITool, IToolDefinition, IToolContextState } from './ITool';
import type { ProjectIndex } from '../indexer/ProjectIndex';
import { ReviewContextState } from '../context/ReviewContextState';
import {
  GetProjectInfoTool,
  GetClassSummaryTool,
  GetClassSourceTool,
  ReadFileTool,
  GetMethodTool,
  ReadMethodTool,
  FindReferencesTool,
  FindImplementationsTool,
  FindCallersTool,
  FindSpringBeansTool,
  SearchProjectTool,
  GetDependencyGraphTool,
  GetPackageStructureTool,
  GetStaticFindingsTool,
  GetScorecardTool,
  GetDependenciesTool,
  GetConfiguredRulesTool,
  GetRuleTool,
  ListPackagesTool,
  ListFilesTool,
  GetReviewScopeTool,
  GetArchitectureSummaryTool,
  GetWorkspaceTreeTool,
  GetProjectStatisticsTool,
  GetDependencyCyclesTool,
  GetRestEndpointsTool,
  GetJpaQueriesTool,
  GetViolationsTool,
  GetUnusedBeansTool,
  GetSecurityReportTool,
  GetPerformanceReportTool,
  GetTestingReportTool,
  GetPackageSummaryTool,
} from './ProjectTools';

export class ToolRegistry {
  private readonly tools = new Map<string, ITool>();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.register(new ReadFileTool());
    this.register(new ReadMethodTool());
    this.register(new GetProjectInfoTool());
    this.register(new GetClassSummaryTool());
    this.register(new GetClassSourceTool());
    this.register(new GetMethodTool());
    this.register(new FindReferencesTool());
    this.register(new FindImplementationsTool());
    this.register(new FindCallersTool());
    this.register(new FindSpringBeansTool());
    this.register(new SearchProjectTool());
    this.register(new GetDependencyGraphTool());
    this.register(new GetPackageStructureTool());
    this.register(new GetStaticFindingsTool());
    this.register(new GetScorecardTool());
    this.register(new GetDependenciesTool());
    this.register(new GetConfiguredRulesTool());
    this.register(new GetRuleTool());
    this.register(new ListPackagesTool());
    this.register(new ListFilesTool());
    this.register(new GetReviewScopeTool());
    this.register(new GetArchitectureSummaryTool());
    this.register(new GetWorkspaceTreeTool());
    this.register(new GetProjectStatisticsTool());
    this.register(new GetDependencyCyclesTool());
    this.register(new GetRestEndpointsTool());
    this.register(new GetJpaQueriesTool());
    this.register(new GetViolationsTool());
    this.register(new GetUnusedBeansTool());
    this.register(new GetSecurityReportTool());
    this.register(new GetPerformanceReportTool());
    this.register(new GetTestingReportTool());
    this.register(new GetPackageSummaryTool());
  }

  public register(tool: ITool): void {
    this.tools.set(tool.definition.name, tool);
  }

  public get(toolName: string): ITool | undefined {
    return this.tools.get(toolName);
  }

  public getToolDefinitions(): IToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  public async execute(
    toolName: string,
    args: Record<string, any>,
    index: ProjectIndex,
    contextState?: IToolContextState
  ): Promise<string> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return `Error: Unknown tool '${toolName}'. Available tools: ${Array.from(this.tools.keys()).join(', ')}`;
    }
    if (contextState instanceof ReviewContextState) {
      contextState.recordToolExecution(toolName, args);
      if (args.path || args.filePath) {
        contextState.markFileVisited(args.path || args.filePath);
      }
      if (args.class && args.method) {
        contextState.markMethodVisited(args.class, args.method);
      }
    }
    try {
      return await tool.execute(args, index, contextState);
    } catch (err) {
      return `Error executing tool '${toolName}': ${err instanceof Error ? err.message : String(err)}`;
    }
  }
}
