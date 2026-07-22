/**
 * All valid AI provider identifiers.
 * Adding a new provider requires implementing AIProvider and adding it here.
 */
export type AIProviderType = 'openai' | 'gemini' | 'claude' | 'ollama' | 'openrouter' | 'groq' | 'github' | 'vscode-lm';

/**
 * Runtime configuration resolved for an AI provider call.
 */
export interface IProviderConfig {
  readonly provider: AIProviderType;
  readonly model: string;
  /** Optional base URL override (Ollama, OpenRouter, self-hosted) */
  readonly baseUrl?: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
}
