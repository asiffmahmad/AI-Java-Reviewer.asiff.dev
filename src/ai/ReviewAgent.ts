import type { IJavaClass } from '../models';
import type { IReviewConfig } from '../configuration/ReviewConfig';
import type { RuleEngine } from '../rules/RuleEngine';
import type { ScoreCalculator } from '../scoring/ScoreCalculator';
import { LLMProviderFactory } from './LLMProviderFactory';
import { PromptGenerator } from './PromptGenerator';

export class ReviewAgent {
  private ruleEngine: RuleEngine;
  private scoreCalculator: ScoreCalculator;
  private promptGenerator: PromptGenerator;

  constructor(ruleEngine: RuleEngine, scoreCalculator: ScoreCalculator) {
    this.ruleEngine = ruleEngine;
    this.scoreCalculator = scoreCalculator;
    this.promptGenerator = new PromptGenerator();
  }

  /**
   * Orchestrates the review process:
   * 1. Evaluates rules locally.
   * 2. Calculates score.
   * 3. Generates prompt.
   * 4. Calls LLM.
   *
   * @param classes The parsed Java classes.
   * @param dependencies The parsed project dependencies.
   * @param config The active project config.
   * @param apiKey The API key for the configured AI provider.
   * @returns A promise resolving to the final review markdown.
   */
  public async executeReview(
    classes: IJavaClass[],
    dependencies: string[],
    config: IReviewConfig,
    apiKey: string
  ): Promise<string> {
    // 1. Evaluate deterministic rules
    const findings = this.ruleEngine.evaluate(classes, config);

    // 2. Calculate scores
    const score = this.scoreCalculator.calculate(findings);

    // 3. Generate context prompt
    const prompt = this.promptGenerator.generate(classes, dependencies, findings, score, config);

    // 4. Invoke LLM
    let baseUrl: string | undefined;
    if (config.provider === 'ollama') {
      baseUrl = config.ollamaBaseUrl;
    } else if (config.provider === 'openrouter') {
      baseUrl = config.openRouterBaseUrl;
    }

    const llmProvider = LLMProviderFactory.createProvider(config.provider, apiKey, config.model, baseUrl);
    const aiReview = await llmProvider.generateReview(prompt);

    return aiReview;
  }
}
