import type { AIProviderType } from '../models/ProviderConfig';

// ── Extension identifiers ─────────────────────────────────────────────────────

export const EXTENSION_ID = 'ai-java-reviewer';
export const EXTENSION_NAME = 'AI Java Reviewer';

// ── Command identifiers ───────────────────────────────────────────────────────

export const COMMAND_IDS = {
  RUN_REVIEW: 'aijavareviewer.runReview',
  CONFIGURE_PROVIDER: 'aijavareviewer.configureProvider',
  SHOW_REPORT: 'aijavareviewer.showReport',
} as const;

// ── Secret storage keys ───────────────────────────────────────────────────────

export const SECRET_STORAGE_KEYS = {
  OPENAI_API_KEY: 'aijavareviewer.openai.apiKey',
  GEMINI_API_KEY: 'aijavareviewer.gemini.apiKey',
  CLAUDE_API_KEY: 'aijavareviewer.claude.apiKey',
  OPENROUTER_API_KEY: 'aijavareviewer.openrouter.apiKey',
  GROQ_API_KEY: 'aijavareviewer.groq.apiKey',
  GITHUB_API_KEY: 'aijavareviewer.github.apiKey',
} as const;

// ── Configuration ─────────────────────────────────────────────────────────────

export const CONFIG_FILE_NAME = '.reviewai.yml';
export const DEFAULT_OUTPUT_DIR = '.review-ai/reports';
export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';
export const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/** Default model for each provider. Used when provider changes and no model override is set. */
export const DEFAULT_MODELS: Record<AIProviderType, string> = {
  openai: 'gpt-4o',
  gemini: 'gemini-1.5-pro',
  claude: 'claude-3-5-sonnet-20241022',
  ollama: 'codellama',
  openrouter: 'openai/gpt-4o',
  groq: 'llama-3.3-70b-versatile',
  github: 'gpt-4o',
  'vscode-lm': 'auto',
};

/** Default maxContextChars per provider when no explicit override is provided */
export const DEFAULT_PROVIDER_MAX_CONTEXT_CHARS: Record<AIProviderType, number> = {
  openai: 400000,
  github: 400000,
  gemini: 1000000,
  claude: 500000,
  groq: 32000,
  ollama: 32000,
  openrouter: 200000,
  'vscode-lm': 400000,
};

// ── Java project detection ────────────────────────────────────────────────────

/** Files whose presence indicates a Maven or Gradle Java project. */
export const JAVA_PROJECT_INDICATORS = ['pom.xml', 'build.gradle', 'build.gradle.kts'] as const;

/** Regex for matching Java source files */
export const JAVA_FILE_REGEX = /\.java$/;

/** Directories excluded from file discovery */
export const EXCLUDED_DIRECTORIES = [
  'node_modules',
  '.git',
  'target',
  'build',
  'out',
  '.vscode',
  '.idea',
] as const;

// ── Rule identifiers ──────────────────────────────────────────────────────────

/** Canonical Rule IDs referenced by the Rule Engine and ScoreCalculator. */
export const RULE_IDS = {
  FIELD_INJECTION: 'RULE_FIELD_INJECTION',
  MISSING_TRANSACTIONAL: 'RULE_MISSING_TRANSACTIONAL',
  SYSTEM_OUT_PRINTLN: 'RULE_SYSTEM_OUT_PRINTLN',
  MISSING_VALID: 'RULE_MISSING_VALID',
  CIRCULAR_DEPENDENCY: 'RULE_CIRCULAR_DEPENDENCY',
  REPOSITORY_IN_CONTROLLER: 'RULE_REPOSITORY_IN_CONTROLLER',
  MISSING_EXCEPTION_HANDLER: 'RULE_MISSING_EXCEPTION_HANDLER',
  MISSING_LOGGING: 'RULE_MISSING_LOGGING',
  HARDCODED_SECRET: 'RULE_HARDCODED_SECRET',
  NON_CONSTRUCTOR_INJECTION: 'RULE_NON_CONSTRUCTOR_INJECTION',
  N_PLUS_ONE_QUERY: 'RULE_N_PLUS_ONE_QUERY',
  LAZY_LOADING_OUTSIDE_TX: 'RULE_LAZY_LOADING_OUTSIDE_TX',
  UNUSED_BEAN: 'RULE_UNUSED_BEAN',
  MISSING_SPRING_BOOT_TEST: 'RULE_MISSING_SPRING_BOOT_TEST',
  FIND_ALL_WITHOUT_PAGINATION: 'RULE_FIND_ALL_WITHOUT_PAGINATION',
} as const;

// ── Scoring ───────────────────────────────────────────────────────────────────

/** Default score deductions per rule. Can be overridden in .reviewai.yml. */
export const DEFAULT_SCORE_DEDUCTIONS: Record<string, number> = {
  [RULE_IDS.FIELD_INJECTION]: 2,
  [RULE_IDS.MISSING_TRANSACTIONAL]: 3,
  [RULE_IDS.SYSTEM_OUT_PRINTLN]: 2,
  [RULE_IDS.MISSING_VALID]: 3,
  [RULE_IDS.CIRCULAR_DEPENDENCY]: 5,
  [RULE_IDS.REPOSITORY_IN_CONTROLLER]: 3,
  [RULE_IDS.MISSING_EXCEPTION_HANDLER]: 3,
  [RULE_IDS.MISSING_LOGGING]: 2,
  [RULE_IDS.HARDCODED_SECRET]: 5,
  [RULE_IDS.NON_CONSTRUCTOR_INJECTION]: 2,
  [RULE_IDS.N_PLUS_ONE_QUERY]: 3,
  [RULE_IDS.LAZY_LOADING_OUTSIDE_TX]: 3,
  [RULE_IDS.UNUSED_BEAN]: 1,
  [RULE_IDS.MISSING_SPRING_BOOT_TEST]: 1,
  [RULE_IDS.FIND_ALL_WITHOUT_PAGINATION]: 2,
};

/** Score weight per category — must sum to 1.0 */
export const SCORE_WEIGHTS = {
  architecture: 0.25,
  security: 0.25,
  performance: 0.20,
  maintainability: 0.20,
  testing: 0.10,
} as const;
