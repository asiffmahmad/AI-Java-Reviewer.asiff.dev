<h1 align="center">
  <br>
  <img src="https://raw.githubusercontent.com/asiffmahmad/AI-Java-Reviewer.asiff.dev/main/assets/logo.png" alt="AI Java Reviewer" width="200">
  <br>
  AI Java Reviewer
  <br>
</h1>

<h4 align="center">Enterprise-grade AI-powered Java & Spring Boot code review — deterministic static analysis paired with actionable AI explanations.</h4>

<p align="center">
  <a href="https://github.com/asiffmahmad/AI-Java-Reviewer.asiff.dev/actions"><img src="https://img.shields.io/github/actions/workflow/status/asiffmahmad/AI-Java-Reviewer.asiff.dev/ci.yml" alt="Build Status"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=ai-java-reviewer.ai-java-reviewer"><img src="https://img.shields.io/visual-studio-marketplace/v/ai-java-reviewer.ai-java-reviewer" alt="Version"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=ai-java-reviewer.ai-java-reviewer"><img src="https://img.shields.io/visual-studio-marketplace/i/ai-java-reviewer.ai-java-reviewer" alt="Installs"></a>
  <a href="https://github.com/asiffmahmad/AI-Java-Reviewer.asiff.dev/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#supported-ai-providers">Providers</a> •
  <a href="#installation">Installation</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#contributing">Contributing</a>
</p>

![Hero Banner](https://raw.githubusercontent.com/asiffmahmad/AI-Java-Reviewer.asiff.dev/main/assets/hero-banner.png)

## Features

* **Deterministic Rule Engine:** Extremely fast local AST parsing detects architectural anti-patterns (Field Injection, Missing `@Transactional`, Raw console logging) in milliseconds.
* **Executive Scorecard & Reporting:** Redesigned reports with Letter Grade badges (A+ to F), Executive Scorecard tables, and Category/Severity matrices.
* **Fail-Safe Prompt Artifacts:** Automatically writes `prompt-<timestamp>.md` alongside reports for easy copy-pasting into Web AI interfaces (Antigravity Chat, Gemini, ChatGPT, Claude).
* **Deterministic Output Guarantee:** Enforces `temperature: 0.0` across all providers for reproducible, consistent review outputs.
* **Privacy First:** We use the native VS Code `SecretStorage` API. Your API keys are encrypted in your OS Keychain and never persisted to plain text files.
* **Multi-Provider & IDE Support:** Connect to VS Code Chat LM API (Antigravity, Copilot), OpenAI, Google Gemini, Anthropic Claude, OpenRouter, Groq, or run 100% locally with Ollama.

## Supported AI Providers
- **VS Code & Antigravity Chat API (`vscode-lm`):** Native IDE models (Antigravity, Copilot Chat, Gemini), no external API key required. Supports manual model family fallback.
- **OpenAI:** `gpt-4o`, `gpt-4-turbo`
- **Google Gemini:** `gemini-1.5-pro`
- **Anthropic Claude:** `claude-3-5-sonnet-20241022`
- **Groq:** `llama-3.3-70b-versatile` (Ultra-fast LPU inference)
- **Ollama:** `llama3`, `mistral`, `codellama` (local, offline)
- **OpenRouter:** Access to hundreds of community models.

## Architecture
![Architecture Diagram](https://raw.githubusercontent.com/asiffmahmad/AI-Java-Reviewer.asiff.dev/main/assets/architecture-diagram.png)

Our extension uniquely combines a **Deterministic Static Analyzer** with an **LLM Orchestrator** to guarantee 0% hallucination on known enterprise rules, while preserving the LLM's ability to spot unknown business logic flaws.

## Installation

You can install the extension directly from the Visual Studio Code Marketplace:

1. Open VS Code.
2. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac) to open the Extensions view.
3. Search for `AI Java Reviewer`.
4. Click **Install**.

## How to Use It (Step-by-Step)

1. Open any Java/Spring Boot workspace in VS Code.
2. Open the Command Palette (`Cmd+Shift+P` on Mac, `Ctrl+Shift+P` on Windows).
3. Type **AI Java Reviewer: Configure AI Provider** and hit Enter.
   - Select your preferred provider (e.g., `openai`, `groq`, `claude`).
   - Enter your API Key. (This is securely stored in your OS Keychain, never on disk).
4. Type **AI Java Reviewer: Run AI Review** and hit Enter.

### What happens when you run a review?
When you trigger a review, the extension does not blindly send your entire codebase to an LLM. Instead, it follows a strict pipeline:
1. **Deterministic Scan**: The local engine parses your Java syntax trees and Maven/Gradle dependencies to find explicit architectural anti-patterns (e.g., Field Injection, missing `@Transactional`).
2. **Scoring**: It grades your codebase (A through F) across Architecture, Security, and Testing.
3. **Contextual Prompt Generation**: It generates a highly dense, deterministic prompt instructing the AI on exactly what rules were broken.
4. **AI Generation**: It streams this context to your configured AI Provider (OpenAI, Groq, etc.) to fetch actionable refactoring advice.

### Where is the result saved?
Once the AI finishes generating the review, the extension automatically:
1. Creates a `.review-ai/reports/` folder at the root of your workspace.
2. Saves a permanent Markdown file named `review-{timestamp}.md` containing the full AI analysis.
3. Opens the Markdown file natively in a new VS Code editor tab for you to read.

You can also pull up the most recent report at any time by running the **AI Java Reviewer: Show Latest Report** command!

## Configuration

To customize how the AI Java Reviewer behaves, you can create a configuration file at the root of your project workspace. 

- **Folder Location**: The very top-level root of your project (same folder as your `pom.xml` or `build.gradle`)
- **Exact File Name**: `.reviewai.yml`

### Sample `.reviewai.yml` (With All Keys)

Here is a complete, exhaustive sample of everything you can configure. You can copy-paste this into your `.reviewai.yml` file and modify what you need:

```yaml
# The Java version your project uses
javaVersion: "21"

# The framework (spring-boot | jakarta-ee | quarkus | micronaut)
framework: "spring-boot"

# Force a specific AI provider (Overrides VS Code settings)
# provider: "openai"

# Force a specific model (Overrides VS Code settings)
# model: "gpt-4o"

# Output directory for the Markdown reports (relative to project root)
outputDir: ".review-ai/reports"

# Override Ollama Base URL (if using local provider)
# ollamaBaseUrl: "http://localhost:11434"

# Override OpenRouter Base URL
# openRouterBaseUrl: "https://openrouter.ai/api/v1"

# --- AI Prompt Customization (Optional) ---
# Use these to completely override the AI's persona and task instructions
systemPrompt: "You are a highly strict senior Java security architect."
taskPrompt: "Review the code and provide only a list of security vulnerabilities in JSON format."

# --- Custom Organizational Rules ---
# Add any custom English instruction or business logic restriction.
# The AI is forced to enforce these exact rules during the review!
# You can use a flat list or group them by category.
rules:
  dependency_injection:
    - constructor injection only
    - no field injection
  security:
    - no hardcoded secrets or credentials
    - passwords must be encoded
  architecture:
    - all DTO classes must end with "Response" or "Request"

# --- Organizational Severity Definitions ---
# Instruct the AI on how to classify severity for your organization
severity:
  BLOCKER:
    - hardcoded secret
    - SQL Injection
  CRITICAL:
    - controller accessing repository
    - missing authorization

# --- Custom Review Categories ---
# Force the AI to output its findings strictly mapped to these categories
review_categories:
  - Security
  - Architecture
  - Performance

# --- Rule Severity Overrides ---
# Upgrade or downgrade the severity of built-in deterministic rules
ruleOverrides:
  - id: "RULE_FIELD_INJECTION"
    severity: "critical"
```

### Custom Organizational Rules
The `rules:` array in `.reviewai.yml` is an incredibly powerful feature. You can add **any custom English instruction or business logic restriction** to this list. The `ReviewOrchestrator` dynamically injects these into the AI's prompt, forcing the AI to strictly enforce your organization's unique coding standards during the review.

## Contributing

See our [Contributing Guide](CONTRIBUTING.md) for details on how to set up the repository for local development and submit Pull Requests.

## License

MIT © Google AI Java Reviewer
