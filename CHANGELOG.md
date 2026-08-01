# Changelog

All notable changes to the "AI Java Reviewer" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.25] - 2026-08-01
### Added
- **Autonomous MR / PR Diff Review (`aijavareviewer.runMrReview`):** Context menu & Command Palette option to review GitLab MRs and GitHub PRs by pasting URL or local branch ref. Line-scoped review for modified lines and full review for new files.
- **Company Code Review Agent Integration:** Loads guidelines directly from `.reviewai.yml` or workspace configuration. Enforces standard single-line output format (`🔴 CRITICAL`, `🔴 MAJOR`, `🟡 MINOR`, `🔵 SUGGESTION`).
- **Token Optimization (~80% Token Reduction):** Replaced raw code embedding with in-scope target relative file path listings and AST metadata, allowing AI agents to dynamically fetch code on demand.
- **Remote PR & Folder Scoping:** Autonomous remote PR URL diff fetching for GitHub and GitLab without local repo requirement. Folder-scoped git diff calculation for right-clicked directories.

## [1.2.9] - 2026-07-23
### Added
- **Modular 9-Stage Prompt Pipeline**: Structured Java AST metadata context, build tool detection (Maven/Gradle), component scope context, and unescaped linebreaks.
- **Pre-Dispatch Prompt Validator**: Automated `PromptValidator` sanitizes absolute system paths, redacts sensitive API keys and tokens, deduplicates organizational rules, and validates code fence syntax.
- **Enterprise Security Hardening**: Workspace path containment checks for single-file URI reviews, path sanitization in Markdown report outputs, and dynamic report location resolution in `ShowReportCommand`.

## [1.2.8] - 2026-07-22
### Added
- Multi-vendor model discovery in `vscode-lm` supporting Antigravity, Google Gemini, GitHub Copilot, Anthropic, and custom LM providers.
- Manual model identifier input fallback in `Configure AI Provider` for restricted enterprise environments.
- Fail-safe prompt artifact generation: automatically writes `prompt-<timestamp>.md` alongside reports for easy web copy-pasting.
- Executive Markdown report redesign with Executive Scorecard tables, Grade badges, and Category/Severity issue breakdowns.
- Enforced deterministic temperature (`0.0`) across all AI providers to prevent output randomness.

## [1.2.7] - 2026-07-22
### Added
- Native VS Code Chat Window API (`vscode-lm`) provider support for keyless organization model integration.
- `VSCODE_LM_PROVIDER.md` documentation guide for setup and requirements.
- Safe fallbacks and diagnostics when `vscode.lm` or models are unavailable.

## [1.2.6] - 2026-07-21
### Added
- Provider-aware `maxContextChars` defaults (400,000 chars for OpenAI & GitHub Models, 1,000,000 for Gemini, 500,000 for Claude).
- Single-file targeted review mode when invoking review on a specific `.java` file URI.
- Ignore build output directories (`target`, `build`, `.gradle`, `out`, `bin`, `dist`, `.git`) during Java file discovery.
- `maxContextChars` truncation in `PromptGenerator` to prevent HTTP 413 / TPM rate-limit errors.

## [1.0.0] - 2026-07-21
### Added
- Initial release of AI Java Reviewer.
- Deterministic Rule Engine for fast, local AST parsing.
- Integration with OpenAI, Gemini, Anthropic, OpenRouter, and local Ollama.
- ScoreCalculator for enterprise code grading (Architecture, Security, Performance, Testing).
- VS Code command palette bindings.
