import * as vscode from 'vscode';
import type { ICommand } from './ICommand';
import { COMMAND_IDS } from '../utils/constants';
import type { AIProviderType } from '../models/ProviderConfig';
import type { SecretManager } from '../configuration/SecretManager';
import { fetchVSCodeChatModels } from '../ai/providers/VSCodeLMHelper';

export class ConfigureProviderCommand implements ICommand {
  public readonly id = COMMAND_IDS.CONFIGURE_PROVIDER;

  constructor(private readonly secretManager: SecretManager) {}

  public async execute(): Promise<void> {
    const providers: AIProviderType[] = ['openai', 'gemini', 'claude', 'openrouter', 'ollama', 'groq', 'github', 'vscode-lm'];
    
    const selected = await vscode.window.showQuickPick(providers, {
      title: 'Select AI Provider to Configure',
      placeHolder: 'Which provider would you like to use for AI Java Reviewer?',
    });

    if (!selected) {
      return;
    }

    if (selected === 'vscode-lm') {
      const availableModels = await fetchVSCodeChatModels();

      if (!availableModels || availableModels.length === 0) {
        const MANUAL_INPUT = 'Enter Model Family/ID Manually (e.g. gemini-1.5-pro, gpt-4o, antigravity)';
        const SELECT_ANOTHER = 'Select Another AI Provider';
        const INSTALL_COPILOT = 'Install GitHub Copilot Chat';

        const action = await vscode.window.showWarningMessage(
          'No active VS Code Chat models detected via auto-discovery. If you are using Antigravity or a custom model extension, you can specify your model family manually.',
          MANUAL_INPUT,
          SELECT_ANOTHER,
          INSTALL_COPILOT
        );

        if (action === MANUAL_INPUT) {
          const manualModel = await vscode.window.showInputBox({
            title: 'VS Code Chat Model Identifier',
            prompt: 'Enter your Language Model family or ID (e.g. gemini-1.5-pro, gpt-4o, antigravity, copilot-gpt-4o)',
            placeHolder: 'e.g. gemini-1.5-pro',
            value: 'auto',
          });

          if (!manualModel) {
            return;
          }

          const config = vscode.workspace.getConfiguration('aijavareviewer');
          await config.update('provider', selected, vscode.ConfigurationTarget.Global);
          await config.update('model', manualModel.trim(), vscode.ConfigurationTarget.Global);

          vscode.window.showInformationMessage(
            `Active AI Provider set to VS Code Chat Window API (vscode-lm) using model: "${manualModel.trim()}".`
          );
          return;
        } else if (action === INSTALL_COPILOT) {
          await vscode.commands.executeCommand('workbench.extensions.search', '@id:GitHub.copilot-chat');
          return;
        } else if (action === SELECT_ANOTHER) {
          return this.execute();
        }
        return;
      }

      // Models found! Let user select from active chat models
      const options = availableModels.map((m) => ({
        label: `$(robot) ${m.name || m.family || m.id}`,
        description: `Vendor: ${m.vendor || 'VS Code'}, Family: ${m.family || m.id}`,
        detail: `ID: ${m.id} | Max Input Tokens: ${m.maxInputTokens || 'N/A'}`,
        modelValue: m.family || m.id,
      }));

      const picked = await vscode.window.showQuickPick(options, {
        title: 'Select VS Code Chat Model',
        placeHolder: 'Select a language model from your installed VS Code Chat extensions',
      });

      if (!picked) {
        return; // User cancelled model picker
      }

      const config = vscode.workspace.getConfiguration('aijavareviewer');
      await config.update('provider', selected, vscode.ConfigurationTarget.Global);
      await config.update('model', picked.modelValue, vscode.ConfigurationTarget.Global);

      vscode.window.showInformationMessage(
        `Active AI Provider set to VS Code Chat Window API (vscode-lm) using model: "${picked.modelValue}". No API key required.`
      );
      return;
    }

    if (selected === 'ollama') {
      const config = vscode.workspace.getConfiguration('aijavareviewer');
      await config.update('provider', selected, vscode.ConfigurationTarget.Global);
      const { DEFAULT_MODELS } = require('../utils/constants');
      await config.update('model', DEFAULT_MODELS[selected], vscode.ConfigurationTarget.Global);

      vscode.window.showInformationMessage(
        'Active AI Provider set to Ollama. Uses local URL configured in settings, no API key required.'
      );
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
