import type { IJavaClass } from '../models';
import type { IReviewConfig } from '../configuration/ReviewConfig';
import type { RuleEngine } from '../rules/RuleEngine';
import type { ScoreCalculator } from '../scoring/ScoreCalculator';
import { LLMProviderFactory } from './LLMProviderFactory';
import { PromptGenerator } from './PromptGenerator';
import { ReportFormatter } from './ReportFormatter';

export interface IReviewResult {
  readonly reportMarkdown: string;
  readonly promptText: string;
}

export class ReviewAgent {
  private ruleEngine: RuleEngine;
  private scoreCalculator: ScoreCalculator;
  private promptGenerator: PromptGenerator;
  private reportFormatter: ReportFormatter;

  constructor(ruleEngine: RuleEngine, scoreCalculator: ScoreCalculator) {
    this.ruleEngine = ruleEngine;
    this.scoreCalculator = scoreCalculator;
    this.promptGenerator = new PromptGenerator();
    this.reportFormatter = new ReportFormatter();
  }

  /**
   * Orchestrates the review process:
   * 1. Evaluates rules locally.
   * 2. Calculates score.
   * 3. Generates prompt.
   * 4. Calls LLM.
   * 5. Formats executive report with score table, issue breakdown, and AI deep-dive.
   *
   * @param classes The parsed Java classes.
   * @param dependencies The parsed project dependencies.
   * @param config The active project config.
   * @param apiKey The API key for the configured AI provider.
   * @param promptFileName Optional filename of the prompt markdown artifact.
   * @returns A promise resolving to IReviewResult containing reportMarkdown and promptText.
   */
  public async executeReview(
    classes: IJavaClass[],
    dependencies: string[],
    config: IReviewConfig,
    apiKey: string,
    promptFileName?: string
  ): Promise<IReviewResult> {
    // 1. Evaluate deterministic rules
    const findings = this.ruleEngine.evaluate(classes, config);

    // 2. Calculate scores
    const score = this.scoreCalculator.calculate(findings);

    // 3. Generate context prompt
    const prompt = this.promptGenerator.generate(classes, dependencies, findings, score, config);

    // 4. Invoke LLM (with complete error safety for all failure modes)
    let baseUrl: string | undefined;
    if (config.provider === 'ollama') {
      baseUrl = config.ollamaBaseUrl;
    } else if (config.provider === 'openrouter') {
      baseUrl = config.openRouterBaseUrl;
    }

    let aiReview = '';
    try {
      const llmProvider = LLMProviderFactory.createProvider(config.provider, apiKey, config.model, baseUrl);
      aiReview = await llmProvider.generateReview(prompt);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const targetPromptFile = promptFileName || 'prompt-<timestamp>.md';

      aiReview =
        `> ⚠️ **AI Review Provider Request Failed**: ${errorMsg}\n\n` +
        `### 💡 Recommended Next Steps for Failed Requests:\n` +
        `1. **Use Prompt Backup Artifact**: The complete prompt artifact has been generated and saved in \`${targetPromptFile}\`. You can copy and paste its contents directly into any Web AI Chat (**Antigravity Chat**, **Google Gemini**, **ChatGPT**, or **Claude Web**).\n` +
        `2. **Check Configuration**: Verify your API key or local endpoint URL via \`AI Java Reviewer: Configure AI Provider\`.\n` +
        `3. **Switch AI Provider**: You can select **Ollama** (100% local/free) or **vscode-lm** from the Command Palette.\n`;
    }

    // 5. Format professional report with score tables and issue breakdowns
    const reportMarkdown = this.reportFormatter.format(score, findings, aiReview, classes.length, promptFileName);

    return {
      reportMarkdown,
      promptText: prompt,
    };
  }
}
