/**
 * A fully assembled prompt sent to an AI provider.
 * Every prompt follows this exact structure — no section is ever omitted.
 * This guarantees consistent AI output format across all providers.
 */
export interface IStructuredPrompt {
  /**
   * Role and behaviour instructions.
   * Always includes the Principal Java Architect system prompt.
   */
  readonly systemInstruction: string;
  /**
   * Project metadata: name, framework, class counts, package structure.
   * Gives the AI context without sending all source files.
   */
  readonly projectContext: string;
  /**
   * Spring bean dependency graph summary.
   * Highlights circular dependencies and architectural relationships.
   */
  readonly dependencyContext: string;
  /**
   * Serialised list of Rule Engine findings for the target class.
   * AI must only explain these — never invent additional findings.
   */
  readonly ruleFindings: string;
  /**
   * Custom rules from .reviewai.yml as plain-language instructions.
   * Injected verbatim so the AI follows project-specific conventions.
   */
  readonly userInstructions: string;
  /**
   * The relevant Java source code for the class being reviewed.
   * Truncated to avoid exceeding context window limits.
   */
  readonly sourceCode: string;
}
