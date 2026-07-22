import * as vscode from 'vscode';
import type { ILLMProvider } from '../ILLMProvider';
import { fetchVSCodeChatModels } from './VSCodeLMHelper';

/**
 * AI Provider that utilizes VS Code's Chat Window / Language Model API (`vscode.lm`).
 * Automatically queries models provided by VS Code (e.g. GitHub Copilot, Antigravity) without needing
 * an external API key. Provides structured fallback reports if no active VS Code chat models exist.
 */
export class VSCodeLMProvider implements ILLMProvider {
  private readonly modelFamily: string;

  constructor(modelFamily = 'auto') {
    this.modelFamily = modelFamily || 'auto';
  }

  public async generateReview(prompt: string): Promise<string> {
    if (!vscode.lm || typeof vscode.lm.selectChatModels !== 'function') {
      return this.getFallbackReview(
        'VS Code Language Model API (vscode.lm) is not supported in this version of VS Code.'
      );
    }

    const allModels = await fetchVSCodeChatModels(this.modelFamily);

    let selectedModel: vscode.LanguageModelChat | undefined;

    if (this.modelFamily && this.modelFamily !== 'auto') {
      const query = this.modelFamily.toLowerCase();
      selectedModel = allModels.find(
        (m) =>
          (m.family && m.family.toLowerCase().includes(query)) ||
          (m.id && m.id.toLowerCase().includes(query)) ||
          (m.name && m.name.toLowerCase().includes(query)) ||
          (m.vendor && m.vendor.toLowerCase().includes(query))
      );
    }

    if (!selectedModel && allModels.length > 0) {
      selectedModel = allModels[0];
    }

    if (!selectedModel) {
      return this.getFallbackReview(
        `No active VS Code Chat models detected in your IDE matching family "${this.modelFamily}". Ensure GitHub Copilot Chat, Antigravity, or an authorized Language Model extension is installed and signed in.`
      );
    }

    try {
      const messages = [
        vscode.LanguageModelChatMessage.User(prompt),
      ];

      const response = await selectedModel.sendRequest(
        messages,
        {},
        new vscode.CancellationTokenSource().token
      );

      let resultText = '';
      for await (const fragment of response.text) {
        resultText += fragment;
      }

      return resultText;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      let customReason = `Failed to communicate with VS Code Chat Model: ${errMsg}`;
      if (errMsg.toLowerCase().includes('account') || errMsg.toLowerCase().includes('supported') || errMsg.toLowerCase().includes('organization')) {
        customReason = `Your organization account policy currently restricts GitHub Copilot / VS Code Chat LM API access in this IDE (${errMsg}).`;
      }
      return this.getFallbackReview(customReason);
    }
  }

  private getFallbackReview(reason: string): string {
    return (
      `> ⚠️ **VS Code LM API Restriction**: ${reason}\n\n` +
      `### 💡 Recommended Solutions for Organization / Enterprise Users:\n` +
      `1. **Use Local Ollama (100% Free & Enterprise Secure)**: Install [Ollama](https://ollama.com/), run \`ollama run llama3\` (or \`qwen2.5\`), and set provider to **Ollama** in extension settings. No cloud credentials required.\n` +
      `2. **Use Organization API Key**: Configure **Google Gemini**, **OpenAI**, **Claude**, **Groq**, or **OpenRouter** in \`AI Java Reviewer: Configure AI Provider\` with an approved organization API key.\n` +
      `3. **Contact Enterprise Administrator**: Ask your organization admin to enable Copilot Chat / Language Model API permissions for your account in VS Code.\n\n`
    );
  }
}
