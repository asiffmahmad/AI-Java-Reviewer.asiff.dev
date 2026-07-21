import * as path from 'path';
import * as yaml from 'js-yaml';
import * as vscode from 'vscode';
import type { AIProviderType } from '../models/ProviderConfig';
import type { IRuleConfig } from '../models/RuleConfig';
import type { IReviewConfig} from './ReviewConfig';
import { DEFAULT_REVIEW_CONFIG } from './ReviewConfig';
import { ConfigurationValidator } from './ConfigurationValidator';
import { FileUtils } from '../utils/FileUtils';
import type { Logger } from '../utils/Logger';
import { CONFIG_FILE_NAME, DEFAULT_MODELS, DEFAULT_PROVIDER_MAX_CONTEXT_CHARS } from '../utils/constants';

/**
 * Loads and merges review configuration from three sources (highest → lowest priority):
 *
 * 1. VS Code settings   — provider/model (machine-specific, never in git)
 * 2. .reviewai.yml      — rules/javaVersion (project-specific, committed to git)
 * 3. DEFAULT_REVIEW_CONFIG — fallback for any unspecified fields
 *
 * Sources are merged field-by-field so that the most specific value always wins.
 */
export class ConfigurationLoader {
  private readonly validator: ConfigurationValidator;

  constructor(private readonly logger: Logger) {
    this.validator = new ConfigurationValidator();
  }

  /**
   * Loads, validates, and merges all configuration sources.
   * Never throws — falls back gracefully on any parse error.
   *
   * @param workspaceRoot  Absolute path to the workspace folder
   */
  public async load(workspaceRoot: string): Promise<IReviewConfig> {
    const yamlPartial = await this.loadFromYaml(workspaceRoot);
    const settingsPartial = this.loadFromVSCodeSettings();
    const merged = this.merge(yamlPartial, settingsPartial);
    this.logger.info('Configuration loaded.', { provider: merged.provider, model: merged.model });
    return merged;
  }

  // ── Source loaders ──────────────────────────────────────────────────────────

  private async loadFromYaml(
    workspaceRoot: string
  ): Promise<Partial<IReviewConfig>> {
    const configPath = path.join(workspaceRoot, CONFIG_FILE_NAME);
    const exists = await FileUtils.fileExists(configPath);

    if (!exists) {
      this.logger.debug(`No ${CONFIG_FILE_NAME} found in workspace root.`);
      return {};
    }

    try {
      const content = await FileUtils.readText(configPath);
      const parsed = yaml.load(content);
      this.validator.validate(parsed);
      this.logger.info(`Loaded ${CONFIG_FILE_NAME}.`);
      return this.mapYamlToConfig(parsed as Record<string, unknown>);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to parse ${CONFIG_FILE_NAME}: ${msg}. Falling back to defaults.`
      );
      return {};
    }
  }

  private loadFromVSCodeSettings(): Partial<IReviewConfig> {
    const s = vscode.workspace.getConfiguration('aijavareviewer');
    const partial: Record<string, unknown> = {};

    const provider = s.get<AIProviderType>('provider');
    if (provider) { partial.provider = provider; }

    const model = s.get<string>('model');
    if (model && model.trim().length > 0) { partial.model = model.trim(); }

    const outputDir = s.get<string>('outputDir');
    if (outputDir && outputDir.trim().length > 0) { partial.outputDir = outputDir.trim(); }

    const ollamaBaseUrl = s.get<string>('ollamaBaseUrl');
    if (ollamaBaseUrl && ollamaBaseUrl.trim().length > 0) {
      partial.ollamaBaseUrl = ollamaBaseUrl.trim();
    }

    const openRouterBaseUrl = s.get<string>('openRouterBaseUrl');
    if (openRouterBaseUrl && openRouterBaseUrl.trim().length > 0) {
      partial.openRouterBaseUrl = openRouterBaseUrl.trim();
    }

    const maxContextChars = s.get<number>('maxContextChars');
    if (maxContextChars && maxContextChars > 0) {
      partial.maxContextChars = maxContextChars;
    }

    return partial as Partial<IReviewConfig>;
  }

  // ── Merge ───────────────────────────────────────────────────────────────────

  /**
   * Merges partials onto the defaults, in the order provided.
   * Later partials override earlier ones.
   */
  private merge(...partials: ReadonlyArray<Partial<IReviewConfig>>): IReviewConfig {
    // Start from a mutable copy of defaults
    const result: Record<string, unknown> = {
      javaVersion: DEFAULT_REVIEW_CONFIG.javaVersion,
      framework: DEFAULT_REVIEW_CONFIG.framework,
      rules: [...DEFAULT_REVIEW_CONFIG.rules],
      provider: DEFAULT_REVIEW_CONFIG.provider,
      model: DEFAULT_REVIEW_CONFIG.model,
      outputDir: DEFAULT_REVIEW_CONFIG.outputDir,
      ollamaBaseUrl: DEFAULT_REVIEW_CONFIG.ollamaBaseUrl,
      openRouterBaseUrl: DEFAULT_REVIEW_CONFIG.openRouterBaseUrl,
      ruleOverrides: [...DEFAULT_REVIEW_CONFIG.ruleOverrides],
      systemPrompt: DEFAULT_REVIEW_CONFIG.systemPrompt,
      taskPrompt: DEFAULT_REVIEW_CONFIG.taskPrompt,
      severity: DEFAULT_REVIEW_CONFIG.severity,
      reviewCategories: DEFAULT_REVIEW_CONFIG.reviewCategories,
    };

    let explicitMaxCharsSet = false;

    for (const partial of partials) {
      if (partial.javaVersion !== undefined) {
        result.javaVersion = String(partial.javaVersion);
      }
      if (partial.framework !== undefined) {
        result.framework = partial.framework;
      }
      if (partial.rules !== undefined && partial.rules.length > 0) {
        result.rules = [...partial.rules];
      }
      if (partial.provider !== undefined) {
        const providerChanged = partial.provider !== result.provider;
        result.provider = partial.provider;
        // Auto-update model when provider changes and no explicit model override
        if (providerChanged && partial.model === undefined) {
          result.model = DEFAULT_MODELS[partial.provider] ?? result.model;
        }
      }
      if (partial.model !== undefined) {
        result.model = partial.model;
      }
      if (partial.outputDir !== undefined) {
        result.outputDir = partial.outputDir;
      }
      if (partial.ollamaBaseUrl !== undefined) {
        result.ollamaBaseUrl = partial.ollamaBaseUrl;
      }
      if (partial.openRouterBaseUrl !== undefined) {
        result.openRouterBaseUrl = partial.openRouterBaseUrl;
      }
      if (partial.ruleOverrides !== undefined && partial.ruleOverrides.length > 0) {
        result.ruleOverrides = [...partial.ruleOverrides];
      }
      if (partial.systemPrompt !== undefined) {
        result.systemPrompt = partial.systemPrompt;
      }
      if (partial.taskPrompt !== undefined) {
        result.taskPrompt = partial.taskPrompt;
      }
      if (partial.severity !== undefined) {
        result.severity = partial.severity;
      }
      if (partial.reviewCategories !== undefined && partial.reviewCategories.length > 0) {
        result.reviewCategories = [...partial.reviewCategories];
      }
      if (partial.maxContextChars !== undefined) {
        result.maxContextChars = partial.maxContextChars;
        explicitMaxCharsSet = true;
      }
    }

    if (!explicitMaxCharsSet) {
      const activeProvider = result.provider as AIProviderType;
      result.maxContextChars = DEFAULT_PROVIDER_MAX_CONTEXT_CHARS[activeProvider] ?? DEFAULT_REVIEW_CONFIG.maxContextChars;
    }

    return result as unknown as IReviewConfig;
  }

  // ── YAML field mapping ──────────────────────────────────────────────────────

  /**
   * Maps raw YAML fields to IReviewConfig fields.
   * Handles the `aiProvider` alias used in .reviewai.yml.
   */
  private mapYamlToConfig(raw: Record<string, unknown>): Partial<IReviewConfig> {
    const partial: Record<string, unknown> = {};

    // Support both `aiProvider` (YAML) and `provider` (settings)
    const providerValue = raw['aiProvider'] ?? raw['provider'];
    if (providerValue !== undefined) {
      partial.provider = providerValue as AIProviderType;
    }

    if (raw['javaVersion'] !== undefined) {
      partial.javaVersion = String(raw['javaVersion']);
    }
    if (raw['framework'] !== undefined) {
      partial.framework = raw['framework'] as string;
    }
    if (raw['rules'] !== undefined) {
      if (Array.isArray(raw['rules'])) {
        partial.rules = raw['rules'] as string[];
      } else if (typeof raw['rules'] === 'object' && raw['rules'] !== null) {
        // Flatten the hierarchical rules object into a single string array
        const flatRules: string[] = [];
        for (const [category, rules] of Object.entries(raw['rules'])) {
          if (Array.isArray(rules)) {
            rules.forEach(rule => flatRules.push(`[${category}] ${rule}`));
          }
        }
        partial.rules = flatRules;
      }
    }
    if (raw['model'] !== undefined) {
      partial.model = raw['model'] as string;
    }
    if (raw['outputDir'] !== undefined) {
      partial.outputDir = raw['outputDir'] as string;
    }
    if (raw['ollamaBaseUrl'] !== undefined) {
      partial.ollamaBaseUrl = raw['ollamaBaseUrl'] as string;
    }
    if (raw['openRouterBaseUrl'] !== undefined) {
      partial.openRouterBaseUrl = raw['openRouterBaseUrl'] as string;
    }
    if (Array.isArray(raw['ruleOverrides'])) {
      partial.ruleOverrides = raw['ruleOverrides'] as IRuleConfig[];
    }
    if (raw['systemPrompt'] !== undefined) {
      partial.systemPrompt = raw['systemPrompt'] as string;
    }
    if (raw['taskPrompt'] !== undefined) {
      partial.taskPrompt = raw['taskPrompt'] as string;
    }
    if (raw['severity'] !== undefined && typeof raw['severity'] === 'object') {
      partial.severity = raw['severity'] as Record<string, string[]>;
    }
    if (Array.isArray(raw['review_categories'])) {
      partial.reviewCategories = raw['review_categories'] as string[];
    }
    if (raw['maxContextChars'] !== undefined && typeof raw['maxContextChars'] === 'number') {
      partial.maxContextChars = raw['maxContextChars'];
    }

    return partial as Partial<IReviewConfig>;
  }
}
