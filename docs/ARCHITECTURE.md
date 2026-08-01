# Architecture Overview

This extension is built entirely using **Clean Architecture** principles and **SOLID** design.

## Core Flow
1. **Parser & Git Layer:** Uses `RegexJavaParser` and `DependencyParser` to extract structural representations of the user's workspace. `GitMrService` parses unified diff hunks, MR/PR URLs, line ranges (`5-10, 25-30`), and remote patch streams.
2. **Rule Engine:** Deterministic static analysis rules (`IRule`) are evaluated against parsed classes.
3. **Scoring Engine:** Aggregates findings and assigns grades (A-F) based on weighted categories.
4. **AI & Prompt Layer:** `PromptGenerator` loads organizational guidelines from `.reviewai.yml`, generates path-only target listings to minimize tokens (~80% savings), and `ReviewAgent` coordinates with `ILLMProvider` to generate the single-line severity review output (`🔴 CRITICAL`, `🔴 MAJOR`, `🟡 MINOR`, `🔵 SUGGESTION`).
5. **VS Code Layer:** Binds core domain to VS Code commands (`aijavareviewer.runReview`, `aijavareviewer.runMrReview`), context menus, and editor reports.

## Dependency Inversion
All external services (like AI APIs, Git Services, File System wrappers) sit behind interfaces (`ILLMProvider`, `IJavaParser`, `IReviewOrchestrator`). This guarantees our core business logic remains incredibly testable and isolated from VS Code specific APIs.
