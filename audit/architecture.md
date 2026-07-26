# AI Java Reviewer — System Architecture Analysis

This document provides a detailed architectural audit of the **AI Java Reviewer** VS Code Extension, mapping the relationships between VS Code commands, orchestrators, static analysis rules, AST parsers, and LLM integrations.

---

## 🏗️ Core Architecture Overview

The extension is designed as a hybrid static analysis and LLM-driven review system. The architecture is decomposed into the following layers:

```mermaid
graph TD
    User["User (VS Code Client)"] -- Triggers Command --> VSCodeCommand["Command Registry & extension.ts"]
    VSCodeCommand -- Invokes --> Orchestrator["ReviewOrchestrator"]
    Orchestrator -- Scans Project --> Indexer["WorkspaceIndexer & ProjectIndex"]
    Orchestrator -- Triggers Parsing --> Parser["JavaAstParser & RegexJavaParser"]
    Orchestrator -- Triggers Analysis --> RuleEngine["RuleEngine"]
    RuleEngine -- Runs Static Checks --> Rules["IRule (Field Injection, Pagination, N+1, etc.)"]
    Orchestrator -- Computes Score --> ScoreCalc["ScoreCalculator"]
    Orchestrator -- Executes AI Layer --> Agent["ReviewAgent"]
    Agent -- Builds Context --> ContextBuilder["ContextBuilder"]
    Agent -- Runs Agent Loop --> AgentLoop["AgenticReviewLoop"]
    AgentLoop -- Calls Local/Cloud API --> LLMProvider["ILLMProvider (Gemini, VS Code LM, etc.)"]
    AgentLoop -- Fetches Code/Metadata --> ToolRegistry["ToolRegistry & ProjectTools"]
    Agent -- Formats Output --> ReportFormatter["ReportFormatter"]
    ReportFormatter -- Generates MD --> FileSystem["Markdown Report File (.review-ai/reports/)"]
```

---

## 🔌 Major Component Dependencies & Interaction Graph

```mermaid
classDiagram
    class ReviewOrchestrator {
        +runReview(uri)
    }
    class JavaAstParser {
        +parse(rawContent, filePath)
    }
    class WorkspaceIndexer {
        +indexWorkspace(root)
    }
    class RuleEngine {
        +evaluate(classes, config)
    }
    class ReviewAgent {
        +executeReview(...)
    }
    class AgenticReviewLoop {
        +runLoop(...)
    }
    class ToolRegistry {
        +execute(toolName, args, index)
    }

    ReviewOrchestrator --> JavaAstParser : Uses to parse source
    ReviewOrchestrator --> WorkspaceIndexer : Indexes workspace
    ReviewOrchestrator --> RuleEngine : Runs rules
    ReviewOrchestrator --> ReviewAgent : Delegates AI review
    ReviewAgent --> AgenticReviewLoop : Multi-turn tool calling
    AgenticReviewLoop --> ToolRegistry : Executes LLM tool calls
    ToolRegistry --> ProjectIndex : Queries indexed symbols
```

---

## 🔍 Key Structural Findings

1. **Decoupled Configuration**: Setting keys are managed by a custom `ConfigurationLoader`, storing credentials securely via VS Code `SecretStorage`.
2. **Deterministic Rules & LLM Symbiosis**: Static findings from the rule engine are calculated first, generating a quality scorecard that is subsequently reviewed by the LLM.
3. **On-Demand (Pull) Design**: The initial context prompt (`seedPrompt`) is intentionally kept lightweight (~300 tokens) to fit within small LLM input context limits. It relies on the model executing MCP-style tool calling to retrieve file contents on demand.
