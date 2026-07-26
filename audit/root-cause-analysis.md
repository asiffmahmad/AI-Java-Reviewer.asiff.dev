# AI Java Reviewer — Root Cause Analysis (Issue Detection Failures)

This document details the exact reasons why the extension fails to accurately detect or report Java issues.

## 🔍 Root Cause 1: Lack of LLM Tool-Calling Support (Critical)

- **Evidence**: `supportsTools` and `generateToolResponse` are unimplemented in all subclasses of `BaseHttpProvider` and `VSCodeLMProvider`.
- **Location**: `src/ai/providers/`
- **Impact**: The agent loop is bypassed, and the LLM receives the `seedPrompt` which contains **zero** source code and **zero** static analysis findings. The model either complains about missing context or hallucinates reviews.
- **Suggested Fix**: Implement a Single-Pass review fallback inside `ReviewAgent` and `ContextBuilder` that automatically bundles the source files, index metadata, and static findings when the provider does not support interactive tools.

---

## 🔍 Root Cause 2: Missing Core Rules Implementation (High)

- **Evidence**: `RULE_IDS` lists `RULE_CIRCULAR_DEPENDENCY`, `RULE_MISSING_LOGGING`, `RULE_MISSING_EXCEPTION_HANDLER`, and others, but no rule classes exist for them in `src/rules/`.
- **Location**: `src/rules/`
- **Impact**: The orchestrator only runs 8 basic rules, missing critical architectural guidelines (e.g. circular dependency, swallowed exceptions, empty catch blocks).
- **Suggested Fix**: Implement these missing rules directly in the static analysis rule folder.

---

## 🔍 Root Cause 3: Incomplete Parser Method Body Extractions (Medium)

- **Evidence**: Method bodies in `JavaAstParser` are extracted based on start and end offsets from `java-parser`. If a class has static initializer blocks or inner classes, offsets can be incorrect, leading to truncated bodies.
- **Location**: `src/parser/JavaAstParser.ts`
- **Impact**: Rule matches (like `SystemOutPrintlnRule` or `NPlusOneQueryRule`) that search the method body string fail to trigger on truncated bodies.
- **Suggested Fix**: Enhance method body bounds detection or fallback to regex body boundary parsing if the AST body range is empty/invalid.
