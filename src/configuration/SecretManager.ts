import * as vscode from 'vscode';
import { SECRET_STORAGE_KEYS } from '../utils/constants';
import type { AIProviderType } from '../models/ProviderConfig';

/**
 * Manages sensitive API keys using VS Code's SecretStorage.
 * Keys are securely encrypted and stored at the OS level (Keychain/Credential Manager).
 */
export class SecretManager {
  constructor(private readonly secretStorage: vscode.SecretStorage) {}

  /**
   * Prompts the user to enter their API key securely and stores it.
   */
  public async promptAndStoreKey(provider: AIProviderType): Promise<void> {
    const key = this.getKeyName(provider);
    
    const input = await vscode.window.showInputBox({
      prompt: `Enter your API key for ${provider}`,
      password: true,
      ignoreFocusOut: true,
    });

    if (input && input.trim().length > 0) {
      await this.secretStorage.store(key, input.trim());
      vscode.window.showInformationMessage(`API key for ${provider} saved securely.`);
    } else {
      vscode.window.showWarningMessage(`No API key provided for ${provider}.`);
    }
  }

  /**
   * Retrieves the stored API key.
   */
  public async getKey(provider: AIProviderType): Promise<string | undefined> {
    const key = this.getKeyName(provider);
    return this.secretStorage.get(key);
  }

  /**
   * Deletes the stored API key.
   */
  public async clearKey(provider: AIProviderType): Promise<void> {
    const key = this.getKeyName(provider);
    await this.secretStorage.delete(key);
  }

  private getKeyName(provider: AIProviderType): string {
    switch (provider) {
      case 'openai': return SECRET_STORAGE_KEYS.OPENAI_API_KEY;
      case 'gemini': return SECRET_STORAGE_KEYS.GEMINI_API_KEY;
      case 'claude': return SECRET_STORAGE_KEYS.CLAUDE_API_KEY;
      case 'openrouter': return SECRET_STORAGE_KEYS.OPENROUTER_API_KEY;
      case 'groq': return SECRET_STORAGE_KEYS.GROQ_API_KEY;
      case 'github': return SECRET_STORAGE_KEYS.GITHUB_API_KEY;
      case 'ollama':
        // Ollama usually runs locally and doesn't require an API key by default
        return 'aijavareviewer.ollama.apiKey';
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}
