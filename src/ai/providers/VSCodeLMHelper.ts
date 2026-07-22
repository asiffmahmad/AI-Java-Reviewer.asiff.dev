import * as vscode from 'vscode';

/**
 * Robustly queries VS Code's Language Model API (vscode.lm) for active chat models.
 * Tries multiple query selectors (family, id, vendor, no-arg, empty-object) to maximize
 * compatibility across GitHub Copilot, Antigravity, Google Gemini, Anthropic, and custom LM providers.
 */
export async function fetchVSCodeChatModels(targetFamily?: string): Promise<vscode.LanguageModelChat[]> {
  if (!vscode.lm || typeof vscode.lm.selectChatModels !== 'function') {
    return [];
  }

  const modelMap = new Map<string, vscode.LanguageModelChat>();

  const collect = (models: vscode.LanguageModelChat[] | undefined | null) => {
    if (Array.isArray(models)) {
      for (const m of models) {
        if (m) {
          const key = m.id || `${m.vendor || 'vscode'}:${m.family || 'unknown'}`;
          if (!modelMap.has(key)) {
            modelMap.set(key, m);
          }
        }
      }
    }
  };

  const safeSelect = async (selector?: vscode.LanguageModelChatSelector) => {
    try {
      const result = await vscode.lm.selectChatModels(selector);
      collect(result);
    } catch {
      // Ignore query errors for unsupported selectors in specific VS Code builds
    }
  };

  // 1. If a specific family/vendor/id search target is provided (and non-auto)
  if (targetFamily && targetFamily !== 'auto') {
    await safeSelect({ family: targetFamily });
    await safeSelect({ id: targetFamily });
    await safeSelect({ vendor: targetFamily });
  }

  // 2. Standard no-arg query (queries all registered models in standard VS Code)
  await safeSelect();
  await safeSelect({});

  // 3. Query common known vendors (Antigravity, Copilot, Google, Gemini, OpenAI, GitHub, VSCode)
  const knownVendors = ['antigravity', 'copilot', 'google', 'gemini', 'openai', 'github', 'vscode'];
  for (const vendor of knownVendors) {
    await safeSelect({ vendor });
  }

  return Array.from(modelMap.values());
}
