# AI Java Reviewer — LLM execution & integration audit

This document audits LLM provider integration and tool calling capabilities.

## 🤖 Provider Execution Breakdown

The extension lists 8 AI providers in settings (`package.json`):
1. `openai`
2. `gemini`
3. `claude`
4. `ollama`
5. `openrouter`
6. `groq`
7. `github`
8. `vscode-lm` (built-in VS Code chat models)

All providers are instantiated through `LLMProviderFactory.createProvider()`.

---

## 🚫 The Tool-Calling Gap (The Root Failure)

1. **Interface definition**:
   `ILLMProvider` specifies:
   - `supportsTools?(): boolean;`
   - `generateToolResponse?(messages: IMessage[], tools: IToolDefinition[]): Promise<LLMToolResponse>;`

2. **Provider implementations**:
   - `VSCodeLMProvider.ts` — does **not** implement either method.
   - `GeminiProvider.ts` — does **not** implement either method.
   - `OpenAIProvider.ts` — does **not** implement either method.
   - `OllamaProvider.ts` — does **not** implement either method.
   - `AnthropicProvider.ts` — does **not** implement either method.
   - `GroqProvider.ts` — does **not** implement either method.
   - `GithubProvider.ts` — does **not** implement either method.
   - `OpenRouterProvider.ts` — does **not** implement either method.

3. **Impact**:
   Since **none** of the providers implement tool-calling, `AgenticReviewLoop.runLoop()` always returns `provider.generateReview(seedPrompt)` directly.
   Because `seedPrompt` contains **no code**, the LLM provider has absolutely no source files or static violations in context.
   This leads to the report containing warning blocks, empty sections, or hallucinated analysis because the LLM is forced to write a review of code it has never seen.
