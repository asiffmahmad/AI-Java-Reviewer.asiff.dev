import type { AIProviderType } from '../models/ProviderConfig';
import type { IReviewConfig } from './ReviewConfig';

const VALID_PROVIDERS: ReadonlyArray<AIProviderType> = [
  'openai',
  'gemini',
  'claude',
  'ollama',
  'openrouter',
  'groq',
  'github',
  'vscode-lm',
];

/**
 * Validates an unknown value (typically raw YAML) against the IReviewConfig schema.
 * Uses assertion functions so callers narrow the type after a successful call.
 *
 * Design: validates only the fields that are present — every field is optional
 * in .reviewai.yml because defaults fill any gaps.
 */
export class ConfigurationValidator {
  /**
   * Asserts that `raw` satisfies the IReviewConfig shape.
   * @throws {Error} with a descriptive message on the first violation found.
   */
  public validate(raw: unknown): asserts raw is Partial<IReviewConfig> {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      throw new Error(
        'Configuration must be an object (check your .reviewai.yml syntax).'
      );
    }

    const obj = raw as Record<string, unknown>;

    this.validateProvider(obj);
    this.validateJavaVersion(obj);
    this.validateFramework(obj);
    this.validateRules(obj);
    this.validateOutputDir(obj);
    this.validateModel(obj);
    this.validateUrls(obj);
    this.validateRuleOverrides(obj);
    this.validateSeverity(obj);
    this.validateReviewCategories(obj);
    this.validateMaxContextChars(obj);
  }

  // ── Field validators ────────────────────────────────────────────────────────

  private validateProvider(obj: Record<string, unknown>): void {
    if (obj['provider'] === undefined) {
      return;
    }
    if (!VALID_PROVIDERS.includes(obj['provider'] as AIProviderType)) {
      throw new Error(
        `Invalid aiProvider "${String(obj['provider'])}". ` +
          `Must be one of: ${VALID_PROVIDERS.join(', ')}.`
      );
    }
  }

  private validateJavaVersion(obj: Record<string, unknown>): void {
    if (obj['javaVersion'] === undefined) {
      return;
    }
    const value = obj['javaVersion'];
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error('javaVersion must be a string or number (e.g. "21" or 21).');
    }
  }

  private validateFramework(obj: Record<string, unknown>): void {
    if (obj['framework'] === undefined) {
      return;
    }
    if (typeof obj['framework'] !== 'string') {
      throw new Error('framework must be a string (e.g. "spring-boot").');
    }
  }

  private validateRules(obj: Record<string, unknown>): void {
    if (obj['rules'] === undefined) {
      return;
    }
    const rules = obj['rules'];
    if (Array.isArray(rules)) {
      rules.forEach((rule: unknown, index: number) => {
        if (typeof rule !== 'string') {
          throw new Error(`rules[${index}] must be a string. Got: ${typeof rule}.`);
        }
      });
    } else if (typeof rules === 'object' && rules !== null) {
      for (const [category, categoryRules] of Object.entries(rules)) {
        if (!Array.isArray(categoryRules)) {
          throw new Error(`rules.${category} must be an array of strings.`);
        }
        categoryRules.forEach((rule: unknown, index: number) => {
          if (typeof rule !== 'string') {
            throw new Error(`rules.${category}[${index}] must be a string.`);
          }
        });
      }
    } else {
      throw new Error('rules must be an array of strings or an object categorizing rules.');
    }
  }

  private validateOutputDir(obj: Record<string, unknown>): void {
    if (obj['outputDir'] === undefined) {
      return;
    }
    if (typeof obj['outputDir'] !== 'string') {
      throw new Error('outputDir must be a string path.');
    }
  }

  private validateModel(obj: Record<string, unknown>): void {
    if (obj['model'] === undefined) {
      return;
    }
    if (typeof obj['model'] !== 'string') {
      throw new Error('model must be a string identifier (e.g. "gpt-4o").');
    }
  }

  private validateUrls(obj: Record<string, unknown>): void {
    const urlFields = ['ollamaBaseUrl', 'openRouterBaseUrl'];
    for (const field of urlFields) {
      if (obj[field] !== undefined && typeof obj[field] !== 'string') {
        throw new Error(`${field} must be a string URL.`);
      }
    }
  }

  private validateRuleOverrides(obj: Record<string, unknown>): void {
    if (obj['ruleOverrides'] === undefined) {
      return;
    }
    if (!Array.isArray(obj['ruleOverrides'])) {
      throw new Error('ruleOverrides must be an array of rule override objects.');
    }
    obj['ruleOverrides'].forEach((override: unknown, index: number) => {
      if (typeof override !== 'object' || override === null) {
        throw new Error(`ruleOverrides[${index}] must be an object.`);
      }
      const entry = override as Record<string, unknown>;
      if (typeof entry['id'] !== 'string') {
        throw new Error(`ruleOverrides[${index}].id must be a string.`);
      }
    });
  }

  private validateSeverity(obj: Record<string, unknown>): void {
    if (obj['severity'] === undefined) {
      return;
    }
    if (typeof obj['severity'] !== 'object' || obj['severity'] === null || Array.isArray(obj['severity'])) {
      throw new Error('severity must be an object categorizing rules.');
    }
    for (const [level, rules] of Object.entries(obj['severity'] as Record<string, unknown>)) {
      if (!Array.isArray(rules)) {
        throw new Error(`severity.${level} must be an array of strings.`);
      }
      rules.forEach((rule: unknown, index: number) => {
        if (typeof rule !== 'string') {
          throw new Error(`severity.${level}[${index}] must be a string.`);
        }
      });
    }
  }

  private validateReviewCategories(obj: Record<string, unknown>): void {
    if (obj['review_categories'] === undefined) {
      return;
    }
    if (!Array.isArray(obj['review_categories'])) {
      throw new Error('review_categories must be an array of strings.');
    }
    obj['review_categories'].forEach((category: unknown, index: number) => {
      if (typeof category !== 'string') {
        throw new Error(`review_categories[${index}] must be a string.`);
      }
    });
  }

  private validateMaxContextChars(obj: Record<string, unknown>): void {
    if (obj['maxContextChars'] !== undefined && typeof obj['maxContextChars'] !== 'number') {
      throw new Error('maxContextChars must be a number.');
    }
  }
}
