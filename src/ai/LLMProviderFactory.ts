import type { ILLMProvider } from './ILLMProvider';
import type { AIProviderType } from '../models/ProviderConfig';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { OpenRouterProvider } from './providers/OpenRouterProvider';
import { OllamaProvider } from './providers/OllamaProvider';
import { GroqProvider } from './providers/GroqProvider';
import { GithubProvider } from './providers/GithubProvider';
import { VSCodeLMProvider } from './providers/VSCodeLMProvider';

export class LLMProviderFactory {
  /**
   * Creates an instance of the requested LLM provider.
   *
   * @param provider The AI provider type requested in config.
   * @param apiKey The API key for the provider.
   * @param modelName The specific model name (e.g. claude-3-sonnet).
   * @param baseUrl Optional base URL override (for Ollama, OpenRouter).
   * @returns An implementation of ILLMProvider.
   */
  public static createProvider(provider: AIProviderType, apiKey: string, modelName = '', baseUrl?: string): ILLMProvider {
    switch (provider) {
      case 'claude':
        return new AnthropicProvider(apiKey, modelName);
      case 'openai':
        return new OpenAIProvider(apiKey, modelName);
      case 'gemini':
        return new GeminiProvider(apiKey, modelName);
      case 'openrouter':
        return new OpenRouterProvider(apiKey, modelName, baseUrl);
      case 'ollama':
        return new OllamaProvider(modelName, baseUrl);
      case 'groq':
        return new GroqProvider(apiKey, modelName);
      case 'github':
        return new GithubProvider(apiKey, modelName);
      case 'vscode-lm':
        return new VSCodeLMProvider(modelName);
      default:
        // By default or for tests return mock
        return new MockProvider();
    }
  }
}

/**
 * Mock provider for unit tests and local testing without network calls.
 */
class MockProvider implements ILLMProvider {
  public async generateReview(_prompt: string): Promise<string> {
    return Promise.resolve('# Mock Review\\n\\nThis is a mock AI generated review.');
  }
}
