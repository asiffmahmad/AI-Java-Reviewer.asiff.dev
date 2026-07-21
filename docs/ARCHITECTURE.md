# Architecture Overview

This extension is built entirely using **Clean Architecture** principles and **SOLID** design.

## Core Flow
1. **Parser Layer:** Uses `RegexJavaParser` and `DependencyParser` to extract structural representations of the user's workspace (AST-like structures, Maven/Gradle dependencies).
2. **Rule Engine:** Deterministic static analysis rules (`IRule`) are evaluated against the parsed classes.
3. **Scoring Engine:** Aggregates findings and assigns grades (A-F) based on weighted categories.
4. **AI Layer:** `PromptGenerator` translates the deterministic context into a dense Markdown prompt, and `ReviewAgent` coordinates with `ILLMProvider` to generate the final human-readable code review.
5. **VS Code Layer (Milestone 6):** Binds the core domain to VS Code commands, webviews, and file watchers.

## Dependency Inversion
All external services (like the AI APIs, File System wrappers) sit behind interfaces (e.g., `ILLMProvider`, `IJavaParser`). This guarantees our core business logic remains incredibly testable and isolated from VS Code specific APIs.
