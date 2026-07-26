import type { IJavaClass, IFinding, IProjectScore } from '../models';
import type { IReviewConfig } from '../configuration/ReviewConfig';
import type { ProjectIndex } from '../indexer/ProjectIndex';
import { PromptValidator } from '../ai/PromptValidator';

export class ContextBuilder {
  /**
   * Generates a token-optimized, agentic seed prompt (~350-500 tokens) for MCP tool-calling LLMs.
   * Employs prompt engineering best practices: step-by-step tool workflows, explicit guardrails,
   * tool parameter hints, and structured report output constraints. Zero preloaded source code.
   * Includes active configured rules and user rule overrides from .reviewai.yaml.
   */
  public buildSeedContext(
    targetClasses: IJavaClass[],
    _dependencies?: string[],
    _findings?: IFinding[],
    _score?: IProjectScore,
    config?: IReviewConfig,
    _index?: ProjectIndex,
    workspaceRoot?: string
  ): string {
    const targetPaths = targetClasses.map((c) => this.sanitizePath(c.filePath, workspaceRoot)).filter(Boolean);
    const baseDirs = this.extractBaseDirectories(targetPaths);

    let seed = `# AI Java Reviewer — Enterprise Agentic MCP Discovery Prompt\n\n`;
    seed += `You are an Autonomous Senior Principal Java & Spring Boot Architect conducting a dynamic, evidence-backed code review.\n\n`;

    seed += `## Objective & Audit Scope\n`;
    seed += `- Target Scope: ${targetPaths.length === 1 ? `Single File (\`${targetPaths[0]}\`)` : `Full Workspace (${targetPaths.length} Java files across ${baseDirs.length || 1} module directories)`}\n`;
    seed += `- Technology Stack: Java ${config?.javaVersion || '17'} (${config?.framework || 'Spring Boot'})\n`;
    if (baseDirs.length > 0) {
      seed += `- Base Module Directories: ${baseDirs.slice(0, 5).map(d => `\`${d}\``).join(', ')}${baseDirs.length > 5 ? '...' : ''}\n`;
    }
    seed += `\n`;

    seed += `## Mandatory Autonomous Discovery Sequence\n`;
    seed += `You MUST discover project context dynamically via MCP tool calls BEFORE writing your review:\n`;
    seed += `1. **Scope & Scope Summary**: Call \`getReviewScope()\` to verify target file boundaries.\n`;
    seed += `2. **Architectural Metadata**: Call \`getProjectMetadata()\` to inspect package hierarchy, layer component metrics, and dependencies.\n`;
    seed += `3. **Configured Rules & Guidelines**: Call \`getConfiguredRules()\` to retrieve active enterprise rules and user overrides.\n`;
    seed += `4. **Quality Scorecard**: Call \`getScorecard()\` to inspect category quality scores (Architecture, Security, Performance, Maintainability, Testing).\n`;
    seed += `5. **Static Findings & Violations**: Call \`getStaticFindings()\` and \`getViolations()\` to inspect deterministic static analysis findings.\n`;
    seed += `6. **On-Demand Source Inspection**: Execute \`readFile(path)\`, \`readMethod(class, method)\`, or \`searchProject(query)\` to inspect affected code components.\n\n`;

    seed += `## Available MCP Tools\n`;
    seed += `Discovery & Metadata: \`getReviewScope\`, \`getProjectMetadata\`, \`listPackages\`, \`listFiles\`, \`getWorkspaceTree\`, \`getArchitectureSummary\`, \`getProjectStatistics\`.\n`;
    seed += `Rules & Violations: \`getConfiguredRules\`, \`getRule\`, \`getScorecard\`, \`getStaticFindings\`, \`getViolations\`, \`getSecurityReport\`, \`getPerformanceReport\`, \`getTestingReport\`, \`getDependencyCycles\`, \`getUnusedBeans\`.\n`;
    seed += `Source On-Demand: \`readFile\`, \`readMethod\`, \`getClassSummary\`, \`getClassSource\`, \`getMethod\`, \`searchProject\`, \`findReferences\`, \`findImplementations\`, \`findCallers\`, \`findSpringBeans\`, \`getRestEndpoints\`, \`getJpaQueries\`, \`getDependencies\`, \`getDependencyGraph\`, \`getPackageSummary\`.\n\n`;

    seed += `## Strict Hallucination Guardrails\n`;
    seed += `- **Zero Assumptions**: Never assume implementation details, method signatures, variable names, or line numbers without retrieving them via tool calls.\n`;
    seed += `- **Strict Evidence Requirement**: Base every finding exclusively on empirical evidence from tool output.\n`;
    seed += `- **No Generic Placeholders**: Use real workspace class names, variable names, method signatures, and annotations in code recommendations and unified diffs.\n`;
    seed += `- **Separate Findings**: Do not duplicate deterministic static findings inside AI architectural recommendations.\n\n`;

    seed += `## Final Report Structure\n`;
    seed += `- Executive Summary & Quality Scorecard\n`;
    seed += `- Grouped Issue Cards (Rule ID, Severity, Category, Risk, Evidence Snippet, Real Code Fix, Unified Diff, Auto-Fix Classification, References)\n`;
    seed += `- AI Architectural Deep-Dive (SOLID, Layering, Spring Design, Transaction Boundaries)\n`;
    seed += `- Prioritized Remediation Roadmap & Sprint Plan\n`;

    return PromptValidator.validateAndSanitize(seed);
  }

  private sanitizePath(filePath: string, workspaceRoot?: string): string {
    if (!filePath) return '';
    const clean = filePath.replace(/\\/g, '/');
    if (workspaceRoot) {
      const cleanRoot = workspaceRoot.replace(/\\/g, '/');
      if (clean.startsWith(cleanRoot)) {
        const rel = clean.slice(cleanRoot.length).replace(/^\//, '');
        if (rel) return rel;
      }
    }
    const srcIdx = clean.toLowerCase().indexOf('src/');
    if (srcIdx !== -1) return clean.slice(srcIdx);
    const parts = clean.split('/').filter(Boolean);
    return parts.slice(-3).join('/');
  }

  private extractBaseDirectories(targetPaths: string[]): string[] {
    const dirs = new Set<string>();
    for (const p of targetPaths) {
      const clean = p.replace(/\\/g, '/');
      const srcIdx = clean.indexOf('/src/');
      if (srcIdx !== -1) {
        dirs.add(clean.substring(0, srcIdx + 5));
      } else {
        const parts = clean.split('/');
        if (parts.length > 2) {
          dirs.add(parts.slice(0, -1).join('/') + '/');
        } else {
          const dirname = clean.includes('/') ? clean.substring(0, clean.lastIndexOf('/') + 1) : './';
          dirs.add(dirname);
        }
      }
    }
    return Array.from(dirs).sort();
  }

  /**
   * Generates a complete single-pass review context prompt containing all source files,
   * static analysis findings, scorecard, and dependencies. Use when LLM provider does not support tools.
   */
  public buildSinglePassContext(
    targetClasses: IJavaClass[],
    dependencies: string[],
    findings: IFinding[],
    score: any,
    _config: IReviewConfig,
    workspaceRoot?: string
  ): string {
    
    let prompt = `# AI Java Reviewer — Enterprise Single-Pass Review Prompt\n\n`;
    prompt += `You are an Autonomous Senior Principal Java & Spring Boot Architect conducting a comprehensive code review.\n\n`;

    prompt += `## 📊 Project Scorecard\n`;
    prompt += `- Overall Score: **${score.overallScore} / 100**\n`;
    for (const cat of ['architecture', 'security', 'performance', 'maintainability', 'testing']) {
      const catScore = (score as any)[`${cat}Score`] ?? 100;
      prompt += `- ${cat.toUpperCase()} Category Score: **${catScore} / 100**\n`;
    }
    prompt += `\n`;

    prompt += `## 🚨 Pre-Identified Static Violations (${findings.length})\n`;
    if (findings.length === 0) {
      prompt += `No static violations pre-detected by local rules.\n\n`;
    } else {
      for (const f of findings) {
        prompt += `### Finding: \`${f.ruleId}\`\n`;
        prompt += `- **Rule Name**: ${f.ruleName}\n`;
        prompt += `- **Severity**: ${f.severity.toUpperCase()}\n`;
        prompt += `- **Category**: ${f.category.toUpperCase()}\n`;
        prompt += `- **File**: \`${this.sanitizePath(f.filePath, workspaceRoot)}:${f.lineNumber}\`\n`;
        prompt += `- **Message**: ${f.message}\n`;
        prompt += `- **Recommendation**: ${f.recommendation}\n\n`;
      }
    }

    prompt += `## 📦 Build Dependencies (${dependencies.length})\n`;
    for (const d of dependencies.slice(0, 20)) {
      prompt += `- \`${d}\`\n`;
    }
    if (dependencies.length > 20) {
      prompt += `- ... and ${dependencies.length - 20} more dependencies.\n`;
    }
    prompt += `\n`;

    prompt += `## 📂 Target Source Files Under Review (${targetClasses.length})\n`;
    let totalChars = 0;
    const MAX_CHARS = 300000; // safe context boundary limit (~75k tokens)

    for (const cls of targetClasses) {
      const relPath = this.sanitizePath(cls.filePath, workspaceRoot);
      const codeSnippet = cls.rawContent;
      
      if (totalChars + codeSnippet.length > MAX_CHARS) {
        prompt += `### [TRUNCATED] File: \`${relPath}\` (File size is too large to fit in prompt budget)\n\n`;
        continue;
      }
      
      totalChars += codeSnippet.length;
      prompt += `### File: \`${relPath}\`\n`;
      prompt += `\`\`\`java\n`;
      prompt += codeSnippet;
      prompt += `\n\`\`\`\n\n`;
    }

    prompt += `## 🎯 Your Task\n`;
    prompt += `Produce the **AI Architectural Analysis & Recommendations** and **Prioritized Remediation Roadmap** sections of the final report.\n`;
    prompt += `Specifically:\n`;
    prompt += `1. **Verify Static Findings**: Audit the pre-identified static violations. Explain the root causes and suggest real-world refactorings with unified diffs.\n`;
    prompt += `2. **Identify Deeper Architectural/Design Defect Patterns**: Critique the classes against SOLID principles, layering guidelines, transaction boundaries, and Spring Boot best practices.\n`;
    prompt += `3. **Prioritized Roadmap**: Create a sprint plan divided into phases based on priority (Phase 1: Immediate/Security, Phase 2: Short-term, etc.).\n\n`;
    
    prompt += `Ensure all recommendations are actionable, specific to the provided source code, and free of placeholder code.\n`;

    return PromptValidator.validateAndSanitize(prompt);
  }
}
