# Changelog

All notable changes to the "AI Java Reviewer" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
