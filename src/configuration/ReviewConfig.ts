import type { AIProviderType } from '../models/ProviderConfig';
import type { IRuleConfig } from '../models/RuleConfig';
import {
  DEFAULT_MODELS,
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OPENROUTER_BASE_URL,
  DEFAULT_OUTPUT_DIR,
} from '../utils/constants';

/**
 * Complete, resolved review configuration.
 * Assembled by ConfigurationLoader from .reviewai.yml + VS Code settings + defaults.
 */
export interface IReviewConfig {
  /** Java version declared in the project, e.g. "21" */
  readonly javaVersion: string;
  /** Framework, e.g. "spring-boot" */
  readonly framework: string;
  /**
   * Custom rules declared in .reviewai.yml.
   * These are injected verbatim into every AI prompt as userInstructions.
   */
  readonly rules: string[];
  /** Custom system prompt override */
  readonly systemPrompt?: string;
  /** Custom task instructions override */
  readonly taskPrompt?: string;
  readonly provider: AIProviderType;
  readonly model: string;
  /** Output directory relative to the workspace root */
  readonly outputDir: string;
  readonly ollamaBaseUrl: string;
  readonly openRouterBaseUrl: string;
  /** Per-rule overrides from .reviewai.yml ruleOverrides section */
  readonly ruleOverrides: IRuleConfig[];
  /** Custom severity definitions */
  readonly severity?: Record<string, string[]>;
  /** Custom review categories */
  readonly reviewCategories?: string[];
}

/**
 * Fallback configuration applied when no .reviewai.yml exists
 * and no VS Code settings have been configured.
 */
export const DEFAULT_REVIEW_CONFIG: IReviewConfig = {
  javaVersion: '17',
  framework: 'spring-boot',
  rules: [
    'constructor injection only',
    'no field injection',
    'use @Transactional on service write methods',
    'prefer SLF4J over System.out.println',
    'no System.out.println',
    'validate all controller inputs with @Valid',
    'no hardcoded secrets or credentials',
    'repositories must not be accessed directly from controllers',
    'use @ControllerAdvice for global exception handling',
    'paginate large result sets — avoid findAll() without Pageable',
  ],
  systemPrompt: 'You are an expert enterprise Java software architect and reviewer.',
  taskPrompt: 'Based on the provided source code, dependencies, and deterministic findings:\\n1. Summarize the overall quality of the code.\\n2. Elaborate on the deterministic findings if necessary.\\n3. Point out any OTHER design flaws, logic bugs, or security vulnerabilities not caught by the deterministic rules.\\n4. Provide actionable recommendations.',
  provider: 'openai',
  model: DEFAULT_MODELS.openai,
  outputDir: DEFAULT_OUTPUT_DIR,
  ollamaBaseUrl: DEFAULT_OLLAMA_BASE_URL,
  openRouterBaseUrl: DEFAULT_OPENROUTER_BASE_URL,
  ruleOverrides: [],
};
