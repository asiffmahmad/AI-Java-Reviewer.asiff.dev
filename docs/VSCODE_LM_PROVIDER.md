# VS Code Chat Window API (`vscode-lm`) Provider

The `vscode-lm` provider enables enterprise-grade AI code reviews directly inside VS Code using VS Code's native Language Model API (`vscode.lm`).

This provider is designed specifically for **organization and corporate enterprise environments** where security policies restrict developers from providing external API keys (e.g. OpenAI, Anthropic, Gemini API keys).

---

## How It Works Under the Hood

```
┌───────────────────────────┐
│   AI Java Reviewer        │
│   (Extension Codebase)    │
└─────────────┬─────────────┘
              │ 1. Evaluates local Java AST & static rules
              │ 2. Calculates security/architecture score
              │ 3. Generates review prompt
              ▼
┌───────────────────────────┐
│   VSCodeLMProvider        │
│   (src/ai/providers)      │
└─────────────┬─────────────┘
              │ 4. Calls vscode.lm.selectChatModels({ family: 'gpt-4o' })
              ▼
┌───────────────────────────┐
│   VS Code LM Subsystem    │
│   (vscode.lm API)         │
└─────────────┬─────────────┘
              │ 5. Authenticates via corporate VS Code session
              │    (GitHub Copilot Chat or Enterprise LM Extension)
              ▼
┌───────────────────────────┐
│   Model Response Stream   │
│   (AsyncIterable<string>) │
└─────────────┬─────────────┘
              │ 6. Aggregates stream & outputs review-timestamp.md
              ▼
┌───────────────────────────┐
│   Saved Markdown Report   │
└───────────────────────────┘
```

---

## Key Benefits for Enterprises

1. **No External API Keys Required**: 
   Corporate security teams often block individual developers from issuing or storing raw external API keys. With `vscode-lm`, authentication is managed globally by VS Code's enterprise session.
2. **Antigravity & Multi-Vendor Support**:
   Queries `vscode.lm` across multiple registered vendor tags (`antigravity`, `google`, `copilot`, `gemini`, `openai`, `github`, `vscode`).
3. **Fail-Safe Prompt Artifacts (`prompt-<timestamp>.md`)**:
   Even if enterprise security policies block direct `vscode.lm` execution or model calls fail, the extension automatically generates `prompt-<timestamp>.md` containing the complete codebase context ready to copy-paste into Web AI Chat.

---

## Step-by-Step Usage Guide

### 1. Select `vscode-lm` via Command Palette
1. Open the Command Palette (`Cmd+Shift+P` on macOS, `Ctrl+Shift+P` on Windows/Linux).
2. Run **`AI Java Reviewer: Configure AI Provider`**.
3. Select **`vscode-lm`** from the quick pick menu.
4. If auto-discovery finds chat models (Copilot, Antigravity, etc.), select your model. If auto-discovery is restricted, select **Enter Model Family/ID Manually** and type your model name (e.g., `gemini-1.5-pro`, `gpt-4o`, `antigravity`).

### 2. Configure via `.reviewai.yml` Project File (Optional)
You can also enforce `vscode-lm` across your entire engineering team by adding it to your repository's `.reviewai.yml`:

```yaml
provider: vscode-lm
model: auto
```

### 3. Run the AI Review
1. Open any Java or Spring Boot project.
2. Run **`AI Java Reviewer: Run AI Review`**.
3. The extension routes the prompt through `vscode.lm`, collects the review feedback, saves the Markdown report in `.review-ai/reports/review-<timestamp>.md`, saves the full prompt artifact in `.review-ai/reports/prompt-<timestamp>.md`, and opens the report automatically in an editor tab.

---

## Error Handling & Diagnostics

| Scenario | Behavior / Error Message | Resolution |
| :--- | :--- | :--- |
| **Organization Account Policy Restriction** | `Your organization account policy currently restricts GitHub Copilot / VS Code Chat LM API access in this IDE.` | Use local **Ollama** (`ollama run llama3`), an approved Organization API key (Gemini/OpenAI), or copy `prompt-<timestamp>.md` into Web AI Chat. |
| **No Chat Models Registered** | `No active VS Code Chat models detected in your IDE matching family...` | Use **Enter Model Family/ID Manually** in `Configure AI Provider`, or install GitHub Copilot Chat / Antigravity. |
| **User Permission Denied** | VS Code prompts for one-time extension consent to access the chat model. | Click **Allow** when VS Code asks permission for AI Java Reviewer to query language models. |
