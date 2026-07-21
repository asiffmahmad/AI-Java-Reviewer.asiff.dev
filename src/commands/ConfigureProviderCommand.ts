import * as vscode from 'vscode';
import type { ICommand } from './ICommand';
import { COMMAND_IDS } from '../utils/constants';
import type { AIProviderType } from '../models/ProviderConfig';
import type { SecretManager } from '../configuration/SecretManager';

export class ConfigureProviderCommand implements ICommand {
  public readonly id = COMMAND_IDS.CONFIGURE_PROVIDER;

  constructor(private readonly secretManager: SecretManager) {}

  public async execute(): Promise<void> {
    const providers: AIProviderType[] = ['openai', 'gemini', 'claude', 'openrouter', 'ollama', 'groq', 'github'];
    
    const selected = await vscode.window.showQuickPick(providers, {
      title: 'Select AI Provider to Configure',
      placeHolder: 'Which provider would you like to set an API key for?',
    });

    if (selected) {
      if (selected === 'ollama') {
        vscode.window.showInformationMessage('Ollama uses a local URL configured in .reviewai.yml or Settings, no API key is typically needed.');
        return;
      }
      await this.secretManager.promptAndStoreKey(selected as AIProviderType);
      
      // Update the provider and default model in the VS Code settings
      const config = vscode.workspace.getConfiguration('aijavareviewer');
      await config.update('provider', selected, vscode.ConfigurationTarget.Global);
      
      const { DEFAULT_MODELS } = require('../utils/constants');
      await config.update('model', DEFAULT_MODELS[selected], vscode.ConfigurationTarget.Global);

      vscode.window.showInformationMessage(`Active AI Provider set to ${selected} using model ${DEFAULT_MODELS[selected]}.`);
    }
  }
}
