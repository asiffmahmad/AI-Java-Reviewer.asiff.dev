# AI Java Reviewer — Code Quality & Layering Audit

This document reviews the codebase against clean code practices and design patterns.

## 📐 SOLID & Clean Architecture Violations

1. **Rule Engine & Scoring Coupling**:
   The `RuleEngine` applies overrides to findings:
   ```typescript
   const severity = override?.severity ?? rule.defaultSeverity;
   const scoreDeduction = override?.scoreDeduction ?? DEFAULT_SCORE_DEDUCTIONS[rule.id] ?? 0;
   ```
   This couples the rule evaluation layer with the scoring system details. A cleaner separation would keep `RuleEngine` purely for matching violations, and delegate score deduction application to `ScoreCalculator`.
2. **LLM Provider Factory Pattern**:
   The `LLMProviderFactory.createProvider()` switch block uses a string to specify provider types, but if a new provider is added, multiple classes must be modified.
3. **Hardcoded Configurations**:
   Default parameters like token contexts and endpoints are spread across `constants.ts` and individual provider files.

---

## 🧹 Code Quality Warnings & Lint Checks

- **Lint Status**: Compiles cleanly with minor warnings.
- **Dead Code**:
  - `src/tools/ToolRegistry.ts` and `src/tools/ProjectTools.ts` define numerous tools (e.g. `getDependencyCycles`, `getUnusedBeans`, `getRestEndpoints`, `getJpaQueries`) that are **never actually invoked** because LLM providers do not support interactive tool calling.
- **Documentation**: Inline docstrings are present in most classes but missing in tool definitions.
- **Exception Handling**:
  - Catch blocks in `JavaAstParser.ts` swallow parsing errors:
    ```typescript
    try {
      const cst = parse(rawContent);
      ...
    } catch {
      // Fallback on CST parse errors (uncompilable source, non-standard syntax, etc.)
    }
    ```
    While parsing fallbacks are good, logging the exact error message at debug level would help troubleshoot parser compatibility issues.
