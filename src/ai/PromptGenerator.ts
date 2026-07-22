import type { IJavaClass, IFinding, IProjectScore } from '../models';
import type { IReviewConfig } from '../configuration/ReviewConfig';

export class PromptGenerator {
  /**
   * Generates the prompt context for the LLM.
   */
  public generate(classes: IJavaClass[], dependencies: string[], findings: IFinding[], score: IProjectScore, config: IReviewConfig): string {
    let prompt = `${config.systemPrompt}\\n\\n`;
    prompt += 'Please review the following code changes.\\n\\n';

    prompt += '## Deterministic Findings\\n';
    prompt += 'The following issues were automatically detected by the local rule engine:\\n';
    if (findings.length === 0) {
      prompt += '- No deterministic issues found.\\n';
    } else {
      findings.forEach(f => {
        prompt += `- [${f.severity.toUpperCase()}] ${f.category}: ${f.message} (File: ${f.filePath}:${f.lineNumber})\\n`;
        prompt += `  Recommendation: ${f.recommendation}\\n`;
      });
    }
    prompt += '\\n';

    prompt += '## Project Score\\n';
    prompt += `- Final Score: ${score.finalScore} / 100 (Grade: ${score.grade})\\n`;
    prompt += `- Architecture: ${score.architecture.score}\\n`;
    prompt += `- Security: ${score.security.score}\\n`;
    prompt += `- Maintainability: ${score.maintainability.score}\\n`;
    prompt += `- Performance: ${score.performance.score}\\n`;
    prompt += `- Testing: ${score.testing.score}\\n\\n`;

    if (config.severity) {
      prompt += '## Organizational Severity Definitions\\n';
      for (const [level, rules] of Object.entries(config.severity)) {
        prompt += `- **${level.toUpperCase()}**: ${rules.join(', ')}\\n`;
      }
      prompt += '\\n';
    }

    if (config.reviewCategories && config.reviewCategories.length > 0) {
      prompt += '## Custom Review Categories\\n';
      prompt += 'Categorize any findings using strictly the following categories:\\n';
      config.reviewCategories.forEach(cat => {
        prompt += `- ${cat}\\n`;
      });
      prompt += '\\n';
    }

    if (config.rules && config.rules.length > 0) {
      prompt += '## Organizational Rules\\n';
      prompt += 'You MUST strictly enforce the following organizational rules during your review. If any of these are violated, you MUST report it as a finding:\\n';
      config.rules.forEach(rule => {
        prompt += `- ${rule}\\n`;
      });
      prompt += '\\n';
    }

    prompt += '## Dependencies\\n';
    if (dependencies.length === 0) {
      prompt += 'No relevant dependencies found.\\n';
    } else {
      dependencies.forEach(d => {
        prompt += `- ${d}\\n`;
      });
    }
    prompt += '\\n';

    prompt += '## Source Files\n';
    const maxChars = config.maxContextChars ?? 32000;
    let accumulatedChars = 0;

    for (const c of classes) {
      if (accumulatedChars + c.rawContent.length > maxChars) {
        const remaining = maxChars - accumulatedChars;
        if (remaining > 100) {
          prompt += `### ${c.filePath}\n\`\`\`java\n${c.rawContent.slice(0, remaining)}\n// [Truncated due to context limit]\n\`\`\`\n\n`;
        }
        prompt += `*(Additional ${classes.length - classes.indexOf(c)} source files omitted to fit within maxContextChars limit of ${maxChars} characters)*\n\n`;
        break;
      }
      prompt += `### ${c.filePath}\n\`\`\`java\n${c.rawContent}\n\`\`\`\n\n`;
      accumulatedChars += c.rawContent.length;
    }

    prompt += '## Task\n';
    prompt += 'Be concise, objective, and deterministic. Avoid random variations in layout.\n\n';
    if (config.taskPrompt) {
      prompt += config.taskPrompt;
    } else {
      prompt += 'Based on the provided source code, dependencies, and deterministic findings:\n';
      prompt += '1. Summarize the overall quality of the code.\n';
      prompt += '2. Elaborate on the deterministic findings if necessary.\n';
      prompt += '3. Point out any OTHER design flaws, logic bugs, or security vulnerabilities not caught by the deterministic rules.\n';
      prompt += '4. Provide actionable recommendations.\n';
    }

    return prompt;
  }
}
