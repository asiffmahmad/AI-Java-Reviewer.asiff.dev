/**
 * Production Prompt Validator and Sanitizer.
 * Inspects generated AI prompts before sending to the LLM to guarantee zero absolute path leaks,
 * zero credential exposure, clean markdown code blocks, deduplicated context, and high signal-to-noise ratio.
 */
export class PromptValidator {
  private static readonly SECRET_PATTERNS = [
    /sk-[a-zA-Z0-9\-_]{20,}/g, // OpenAI API Keys (including sk-proj-...)
    /AKIA[0-9A-Z]{16}/g, // AWS Access Key IDs
    /ghp_[a-zA-Z0-9]{36}/g, // GitHub Personal Access Tokens
    /Bearer\s+[a-zA-Z0-9\-\._~\+\/]+=*/gi, // OAuth Bearer Tokens
  ];

  private static readonly ABSOLUTE_PATH_PATTERNS = [
    /(?:[a-zA-Z]:\\|\/Users\/|\/home\/|\/private\/var\/|\/tmp\/)[^\s\n\)`"'\:]+/g,
  ];

  /**
   * Validates and automatically cleans the generated prompt string.
   */
  public static validateAndSanitize(prompt: string): string {
    let cleanPrompt = prompt;

    // 1. Sanitize any remaining absolute filesystem paths
    cleanPrompt = this.sanitizeAbsolutePaths(cleanPrompt);

    // 2. Redact potential hardcoded secret tokens or credentials
    cleanPrompt = this.redactSecrets(cleanPrompt);

    // 3. Remove duplicate lines in organizational rules section
    cleanPrompt = this.deduplicateRulesSection(cleanPrompt);

    // 4. Ensure proper markdown code fence formatting
    cleanPrompt = this.fixCodeFences(cleanPrompt);

    // 5. Verify review objective & task instructions are present
    if (!cleanPrompt.includes('## Task')) {
      cleanPrompt += '\n\n## Task\nReview the provided Java code context and provide concise, actionable architectural feedback in Markdown format.';
    }

    return cleanPrompt.trim();
  }

  /**
   * Replaces absolute paths (/Users/john/work/..., C:\Users\john\...) with clean relative paths.
   */
  private static sanitizeAbsolutePaths(text: string): string {
    let result = text;
    for (const pattern of this.ABSOLUTE_PATH_PATTERNS) {
      result = result.replace(pattern, (match) => {
        let clean = match.replace(/\\/g, '/');
        const srcIdx = clean.toLowerCase().indexOf('/src/');
        if (srcIdx !== -1) {
          return clean.slice(srcIdx + 1);
        }
        const parts = clean.split('/').filter(Boolean);
        return parts.length > 3 ? parts.slice(-3).join('/') : parts.join('/');
      });
    }
    return result;
  }

  /**
   * Redacts potential hardcoded secret tokens if present in code snippets.
   */
  private static redactSecrets(text: string): string {
    let result = text;
    for (const pattern of this.SECRET_PATTERNS) {
      result = result.replace(pattern, '[REDACTED_SECRET_TOKEN]');
    }
    return result;
  }

  /**
   * Removes duplicate rule entries in the Organizational Rules section.
   */
  private static deduplicateRulesSection(text: string): string {
    const rulesHeader = '## Organizational Rules\n';
    const rulesIdx = text.indexOf(rulesHeader);
    if (rulesIdx === -1) return text;

    const nextSectionIdx = text.indexOf('\n## ', rulesIdx + rulesHeader.length);
    const endIdx = nextSectionIdx !== -1 ? nextSectionIdx : text.length;

    const rulesBlock = text.slice(rulesIdx + rulesHeader.length, endIdx);
    const lines = rulesBlock.split('\n');
    const headerLines: string[] = [];
    const ruleLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('- ')) {
        ruleLines.push(line);
      } else {
        headerLines.push(line);
      }
    }

    const uniqueRuleLines = Array.from(new Set(ruleLines));
    const cleanRulesBlock = [...headerLines, ...uniqueRuleLines].join('\n');

    return text.slice(0, rulesIdx + rulesHeader.length) + cleanRulesBlock + text.slice(endIdx);
  }

  /**
   * Ensures markdown code blocks have proper syntax tags.
   */
  private static fixCodeFences(text: string): string {
    // Replace unlabelled code fences following Java headers with ```java
    return text.replace(/(###\s+[^\n]+\.java\n)```\n/g, '$1```java\n');
  }
}
