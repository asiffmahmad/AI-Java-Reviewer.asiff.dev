import type { IJavaClass } from '../models';
import type { IReviewConfig } from '../configuration/ReviewConfig';
import type { RuleEngine } from '../rules/RuleEngine';
import type { ScoreCalculator } from '../scoring/ScoreCalculator';
import type { ProjectIndex } from '../indexer/ProjectIndex';
import { LLMProviderFactory } from './LLMProviderFactory';
import { ContextBuilder } from '../context/ContextBuilder';
import { ReportFormatter } from './ReportFormatter';
import { ToolRegistry } from '../tools/ToolRegistry';
import { AgenticReviewLoop } from './AgenticReviewLoop';
import type { Logger } from '../utils/Logger';

import { ReviewContextState } from '../context/ReviewContextState';

export interface IReviewResult {
  readonly reportMarkdown: string;
  readonly promptText: string;
}

export class ReviewAgent {
  private ruleEngine: RuleEngine;
  private scoreCalculator: ScoreCalculator;
  private contextBuilder: ContextBuilder;
  private reportFormatter: ReportFormatter;
  private toolRegistry: ToolRegistry;

  constructor(
    ruleEngine: RuleEngine,
    scoreCalculator: ScoreCalculator,
    private readonly logger?: Logger
  ) {
    this.ruleEngine = ruleEngine;
    this.scoreCalculator = scoreCalculator;
    this.contextBuilder = new ContextBuilder();
    this.reportFormatter = new ReportFormatter();
    this.toolRegistry = new ToolRegistry();
  }

  /**
   * Orchestrates the review process:
   * 1. Evaluates rules locally using deterministic engine.
   * 2. Calculates score.
   * 3. Constructs minimal seed context prompt (~150-300 tokens) via ContextBuilder.
   * 4. Invokes LLM agent via multi-turn tool loop (pulling source code, findings, scorecards via tools).
   * 5. Formats executive report with score table, issue breakdown, and AI deep-dive.
   */
  public async executeReview(
    classes: IJavaClass[],
    dependencies: string[],
    config: IReviewConfig,
    apiKey: string,
    promptFileName?: string,
    index?: ProjectIndex,
    workspaceRoot?: string
  ): Promise<IReviewResult> {
    // 1. Evaluate deterministic rules
    const findings = this.ruleEngine.evaluate(classes, config);

    // 2. Calculate scores
    const score = this.scoreCalculator.calculate(findings);

    // 3. Generate minimal seed context prompt (~150-300 tokens) with zero preloaded code
    const seedPrompt = this.contextBuilder.buildSeedContext(classes, dependencies, findings, score, config, index, workspaceRoot);

    // 4. Initialize stateful ReviewContextState
    const contextState = new ReviewContextState({
      findings,
      score,
      dependencies,
      config,
      workspaceRoot,
    });

    // 5. Invoke LLM with agent tool loop
    let baseUrl: string | undefined;
    if (config.provider === 'ollama') {
      baseUrl = config.ollamaBaseUrl;
    } else if (config.provider === 'openrouter') {
      baseUrl = config.openRouterBaseUrl;
    }

    let aiReview = '';
    try {
      const llmProvider = LLMProviderFactory.createProvider(config.provider, apiKey, config.model, baseUrl);
      if (index) {
        const loop = new AgenticReviewLoop(this.toolRegistry, 5, this.logger);
        aiReview = await loop.runLoop(llmProvider, seedPrompt, index, contextState);
      } else {
        aiReview = await llmProvider.generateReview(seedPrompt);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const targetPromptFile = promptFileName || 'prompt-<timestamp>.md';

      aiReview =
        `> ⚠️ **AI Review Provider Request Failed**: ${errorMsg}\n\n` +
        `### 💡 Recommended Next Steps for Failed Requests:\n` +
        `1. **Use Prompt Backup Artifact**: The prompt artifact has been generated and saved in \`${targetPromptFile}\`.\n` +
        `2. **Check Configuration**: Verify your API key or local endpoint URL via \`AI Java Reviewer: Configure AI Provider\`.\n` +
        `3. **Switch AI Provider**: You can select **Ollama** (100% local/free) or **vscode-lm** from the Command Palette.\n`;
    }

    // 5. Format professional report with score tables and issue breakdowns
    const reportMarkdown = this.reportFormatter.format(score, findings, aiReview, classes.length, promptFileName);

    return {
      reportMarkdown,
      promptText: seedPrompt,
    };
  }
}
