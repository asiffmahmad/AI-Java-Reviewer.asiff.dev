import type { IJavaClass, IFinding, IProjectScore } from '../models';
import type { IReviewConfig } from '../configuration/ReviewConfig';
import { PromptValidator } from './PromptValidator';

export class PromptGenerator {
  /**
   * Generates a clean, highly structured, token-optimized prompt for the LLM.
   * Uses modular pipeline stages and automatically passes the prompt through PromptValidator.
   */
  public generate(
    classes: IJavaClass[],
    dependencies: string[],
    findings: IFinding[],
    score: IProjectScore,
    config: IReviewConfig
  ): string {
    const stages: string[] = [];

    // Stage 1: Role & Persona (Principal Java Architect)
    stages.push(this.buildSystemPersona(config));

    // Stage 2: Project & Build Tool Context
    stages.push(this.buildProjectContext(classes, dependencies, config));

    // Stage 3: Specialized Component Scope Context (Controller / Service / Repository / Class / Method)
    const scopeContext = this.buildSpecializedScopeContext(classes);
    if (scopeContext) {
      stages.push(scopeContext);
    }

    // Stage 4: Review Categories & Organizational Rules
    const rulesContext = this.buildRulesAndCategories(config);
    if (rulesContext) {
      stages.push(rulesContext);
    }

    // Stage 5: Deterministic Static Engine Findings
    stages.push(this.buildFindingsBlock(findings));

    // Stage 6: Project Scorecard Summary
    stages.push(this.buildScorecardBlock(score));

    // Stage 7: Dependencies Summary
    stages.push(this.buildDependenciesBlock(dependencies));

    // Stage 8: Relevant Code Snippets
    stages.push(this.buildSourceFilesBlock(classes, config.maxContextChars ?? 32000));

    // Stage 9: Task Instructions & Expected Output Format
    stages.push(this.buildTaskInstructions(classes, config));

    // Join all pipeline stages
    const rawPrompt = stages.join('\n\n');

    // Automatically validate and sanitize prompt before returning
    return PromptValidator.validateAndSanitize(rawPrompt);
  }

  /**
   * Stage 1: System Persona & Senior Architect Role
   */
  private buildSystemPersona(config: IReviewConfig): string {
    const customPrompt = this.normalizeText(config.systemPrompt);
    if (customPrompt) {
      return `${customPrompt}\n\nPlease review the following Java codebase context and provide a production-grade architectural code review.`;
    }
    return 'You are a Principal Java Architect conducting an enterprise software code review.\n\nPlease review the provided Java code context, AST findings, and architectural guidelines.';
  }

  /**
   * Stage 2: High-Level Project & Build Tool Context
   */
  private buildProjectContext(classes: IJavaClass[], dependencies: string[], config: IReviewConfig): string {
    const javaVersion = config.javaVersion || '17';
    const framework = config.framework || 'spring-boot';
    const buildTool = this.detectBuildTool(dependencies);
    const isSingleFile = classes.length === 1;

    let ctx = '## Project Context\n';
    ctx += `- Language: Java ${javaVersion}\n`;
    ctx += `- Framework: ${framework}\n`;
    ctx += `- Build Tool: ${buildTool}\n`;
    ctx += `- Review Scope: ${isSingleFile ? 'Single File Review' : `Workspace Review (${classes.length} files)`}`;

    return ctx;
  }

  /**
   * Stage 3: Specialized Component Scope Context
   */
  private buildSpecializedScopeContext(classes: IJavaClass[]): string | null {
    if (classes.length === 0) return null;

    if (classes.length === 1) {
      const c = classes[0];
      const relPath = this.sanitizeFilePath(c.filePath);
      let ctx = '## Target File Details\n';
      ctx += `- Target File: ${relPath}\n`;
      if (c.packageName) ctx += `- Package: ${c.packageName}\n`;
      if (c.className) ctx += `- Class: ${c.className} (${c.classType || 'class'})\n`;
      if (c.stereotype && c.stereotype !== 'none') ctx += `- Component Stereotype: @${c.stereotype}\n`;

      if (c.methods && c.methods.length > 0) {
        const methodList = c.methods.slice(0, 10).map(m => `${m.name}()`).join(', ');
        ctx += `- Methods (${c.methods.length}): ${methodList}${c.methods.length > 10 ? '...' : ''}\n`;
      }

      if (c.fields && c.fields.length > 0) {
        const fieldCount = c.fields.length;
        const injectedCount = c.fields.filter(f => f.annotations?.includes('Autowired') || f.annotations?.includes('Inject')).length;
        if (injectedCount > 0) {
          ctx += `- Dependency Injection: ${injectedCount} injected fields detected out of ${fieldCount} total fields\n`;
        }
      }
      return ctx.trim();
    }

    // Multi-file summary
    const packages = Array.from(new Set(classes.map(c => c.packageName).filter(Boolean)));
    const classTypes = Array.from(new Set(classes.map(c => c.stereotype).filter(s => s && s !== 'none')));
    
    let ctx = '## Component Overview\n';
    if (packages.length > 0) ctx += `- Packages (${packages.length}): ${packages.slice(0, 5).join(', ')}${packages.length > 5 ? '...' : ''}\n`;
    if (classTypes.length > 0) ctx += `- Component Types: ${classTypes.map(t => `@${t}`).join(', ')}\n`;
    ctx += `- Primary Classes: ${classes.slice(0, 8).map(c => c.className).join(', ')}${classes.length > 8 ? '...' : ''}`;

    return ctx.trim();
  }

  /**
   * Stage 4: Review Categories & Rules
   */
  private buildRulesAndCategories(config: IReviewConfig): string | null {
    const parts: string[] = [];

    if (config.reviewCategories && config.reviewCategories.length > 0) {
      parts.push('### Custom Review Categories\n' + config.reviewCategories.map(cat => `- ${cat}`).join('\n'));
    }

    if (config.rules && config.rules.length > 0) {
      const uniqueRules = Array.from(new Set(config.rules));
      parts.push('### Organizational Guidelines & Constraints\nYou MUST strictly enforce the following organizational guidelines during your review:\n' +
        uniqueRules.map(r => `- ${r}`).join('\n'));
    }

    if (config.severity && Object.keys(config.severity).length > 0) {
      const sevEntries = Object.entries(config.severity)
        .map(([level, rules]) => `- **${level.toUpperCase()}**: ${rules.join(', ')}`);
      parts.push('### Severity Definitions\n' + sevEntries.join('\n'));
    }

    return parts.length > 0 ? '## Review Guidelines\n' + parts.join('\n\n') : null;
  }

  /**
   * Stage 5: Deterministic Static Findings
   */
  private buildFindingsBlock(findings: IFinding[]): string {
    let block = '## Existing Rule Violations (Deterministic Engine)\n';
    if (!findings || findings.length === 0) {
      block += '- No deterministic issues found.';
      return block;
    }

    const lines = findings.map(f => {
      const relPath = this.sanitizeFilePath(f.filePath);
      return `- [${f.severity.toUpperCase()}] ${f.category}: ${f.message} (File: ${relPath}:${f.lineNumber})\n  Actionable Recommendation: ${f.recommendation}`;
    });

    return block + lines.join('\n');
  }

  /**
   * Stage 6: Scorecard Summary
   */
  private buildScorecardBlock(score: IProjectScore): string {
    return '## Scorecard Overview\n' +
      `- Final Quality Score: ${score.finalScore} / 100 (Grade: ${score.grade})\n` +
      `- Architecture: ${score.architecture.score} | Security: ${score.security.score} | Maintainability: ${score.maintainability.score} | Performance: ${score.performance.score} | Testing: ${score.testing.score}`;
  }

  /**
   * Stage 7: Dependencies Summary
   */
  private buildDependenciesBlock(dependencies: string[]): string {
    let block = '## Dependencies\n';
    if (!dependencies || dependencies.length === 0) {
      block += 'No relevant dependencies found.';
      return block;
    }

    const uniqueDeps = Array.from(new Set(dependencies));
    return block + uniqueDeps.map(d => `- ${d}`).join('\n');
  }

  /**
   * Stage 8: Relevant Code Snippets (with sanitized relative paths)
   */
  private buildSourceFilesBlock(classes: IJavaClass[], maxChars: number): string {
    let block = '## Relevant Code\n';
    if (!classes || classes.length === 0) {
      block += 'No source files provided.';
      return block;
    }

    let accumulatedChars = 0;

    for (let i = 0; i < classes.length; i++) {
      const c = classes[i];
      const relPath = this.sanitizeFilePath(c.filePath);
      const content = c.rawContent || '';

      if (accumulatedChars + content.length > maxChars) {
        const remaining = maxChars - accumulatedChars;
        if (remaining > 100) {
          block += `### ${relPath}\n\`\`\`java\n${content.slice(0, remaining)}\n// [Truncated due to context limit]\n\`\`\`\n\n`;
        }
        const omittedCount = classes.length - i;
        block += `*(Additional ${omittedCount} source file${omittedCount > 1 ? 's' : ''} omitted to fit within maxContextChars limit of ${maxChars} characters)*`;
        break;
      }

      block += `### ${relPath}\n\`\`\`java\n${content}\n\`\`\`\n\n`;
      accumulatedChars += content.length;
    }

    return block.trim();
  }

  /**
   * Stage 9: Task Instructions & Expected Output Format
   */
  private buildTaskInstructions(classes: IJavaClass[], config: IReviewConfig): string {
    const targetScope = classes.length === 1 && classes[0]
      ? `target file "${this.sanitizeFilePath(classes[0].filePath)}"`
      : `provided ${classes.length} Java files`;

    let block = '## Task Instructions\n';
    block += `Review ONLY the code context and deterministic violations for the ${targetScope}.\n\n`;

    const customTask = this.normalizeText(config.taskPrompt);
    if (customTask) {
      block += customTask;
    } else {
      block += 'Identify and explain:\n';
      block += '1. **Problems & Flaws**: Architectural anti-patterns, security risks, performance bottlenecks, or logic bugs.\n';
      block += '2. **Severity Level**: Categorize as Critical, Major, Minor, or Suggestion.\n';
      block += '3. **Technical Explanation**: Why it matters and enterprise impact.\n';
      block += '4. **Recommended Fix & Improved Code**: Provide ready-to-use refactored Java code snippets.\n';
      block += '5. **Best Practices**: Enterprise Java / Spring Boot design patterns.\n';
    }

    block += '\n\n**Output Constraints**: Return your complete response in clean, professional Markdown with valid ````java code blocks.';
    return block;
  }

  /**
   * Helper: Detect build tool (Maven vs Gradle) from dependencies list.
   */
  private detectBuildTool(dependencies: string[]): string {
    if (!dependencies || dependencies.length === 0) return 'Maven / Gradle';
    const isGradle = dependencies.some(d => d.includes('implementation') || d.includes('api') || d.includes('testImplementation'));
    return isGradle ? 'Gradle' : 'Maven';
  }

  /**
   * Helper: Normalizes string literal '\\n' into real line breaks.
   */
  private normalizeText(text?: string): string {
    if (!text) return '';
    return text.replace(/\\n/g, '\n').trim();
  }

  /**
   * Helper: Sanitizes absolute filesystem paths to clean relative paths.
   */
  private sanitizeFilePath(filePath: string): string {
    if (!filePath) return '';
    let clean = filePath.replace(/\\/g, '/');

    // Extract from /src/ if present
    const srcIdx = clean.toLowerCase().indexOf('/src/');
    if (srcIdx !== -1) {
      return clean.slice(srcIdx + 1);
    }

    // Strip leading slash if simple root file like /Test.java
    if (clean.startsWith('/') && clean.split('/').length === 2) {
      return clean.slice(1);
    }

    // Retain last 3 path segments
    const parts = clean.split('/').filter(Boolean);
    if (parts.length > 3) {
      return parts.slice(-3).join('/');
    }

    return parts.join('/') || filePath;
  }
}
