# AI Java Reviewer — Security & Hardening Audit

This document details the security posture and potential vulnerabilities in the extension.

## 🛡️ Secrets Management

1. **Credential Isolation**:
   In `SecretManager.ts`, all API keys (OpenAI, Gemini, Claude, Groq, etc.) are stored using VS Code's `SecretStorage` API. They are never written to `settings.json` or local text files, preventing leakage to version control.
2. **Access Control**:
   API keys are loaded on demand during orchestrator execution.

---

## ☣️ Vulnerability & Risk Analysis

1. **Prompt Injection**:
   - **Risk**: Moderate.
   - **Description**: If the extension reads a Java source file containing malicious payload comments, it could alter the system instruction behavior of the LLM.
   - **Remediation**: Use XML tags to separate the code blocks from system instructions and instruct the LLM to ignore instructions inside those tag sections.
2. **Path Traversal / Host File Access**:
   - **Risk**: None / Fully Mitigated.
   - **Description**: The file tools in `ProjectTools.ts` (like `readFile` or `getClassSource`) query target file data directly from the in-memory `ProjectIndex` cache. They do not perform raw `fs.readFile` commands on arbitrary user paths, eliminating the risk of host file path traversal.
3. **Regex Denial of Service (ReDoS)**:
   - **Risk**: Moderate.
   - **Description**: Regex patterns in `RegexJavaParser` and `HardcodedSecretRule` run on raw source code. Maliciously crafted source lines could trigger exponential backtracking.
   - **Remediation**: Keep regex patterns simple and anchored where possible.
