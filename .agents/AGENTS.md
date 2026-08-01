# Project Guidelines — AI Java Reviewer

## System Architecture & Knowledge Reference

The comprehensive System Knowledge Graph, component relationships, static rule inventory, LLM provider mapping, and execution flow for this project are documented in:
- [.agents/knowledge_graph.md](file:///Users/asiff/Documents/projects/codeReview/.agents/knowledge_graph.md)

### Key Rules for Working on this Codebase:
1. **Preserve Determinism**: Static analysis rules in `src/rules/` must operate deterministically without hallucination.
2. **Provider Tool Support**: Any new AI provider added to `src/ai/providers/` must implement `supportsTools()` and `generateToolResponse()` if it supports interactive tool calling, or fall back to single-pass review context via `ContextBuilder.buildSinglePassContext()`.
3. **Symbol Index Updates**: Ensure `WorkspaceIndexer` and `ProjectIndex` are updated whenever class models or annotation structures change.
4. **Verification**: Always run `npm test` after modifying parsers, rules, providers, or tools to ensure all 64 unit test suites pass.
