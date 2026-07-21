# Changelog

All notable changes to the "AI Java Reviewer" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
