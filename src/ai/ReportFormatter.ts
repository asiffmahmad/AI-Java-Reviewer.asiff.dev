import type { IFinding, IProjectScore } from '../models';
import { ReportFixGenerator } from './ReportFixGenerator';

export class ReportFormatter {
  /**
   * Formats the final Code Review Markdown report into a comprehensive enterprise report.
   * Maintains 100% backward compatibility with public API signature.
   */
  public format(
    score: IProjectScore,
    findings: IFinding[],
    aiContent: string,
    fileCount: number,
    promptFileName?: string
  ): string {
    const totalIssues = findings.length;

    // Severity Counters
    let criticalCount = 0;
    let majorCount = 0;
    let minorCount = 0;
    let suggestionCount = 0;

    // Group findings by Rule ID
    const groupedRulesMap = new Map<string, { ruleName: string; category: string; severity: string; findings: IFinding[] }>();
    const categoryCounts: Record<string, { critical: number; major: number; minor: number; suggestion: number; total: number }> = {};
    const moduleDebtMap = new Map<string, { count: number; fixMinutes: number }>();
    const classRiskMap = new Map<string, { filePath: string; count: number; maxSeverity: string }>();

    for (const f of findings) {
      if (f.severity === 'critical') criticalCount++;
      else if (f.severity === 'major') majorCount++;
      else if (f.severity === 'minor') minorCount++;
      else suggestionCount++;

      const cat = f.category || 'general';
      if (!categoryCounts[cat]) {
        categoryCounts[cat] = { critical: 0, major: 0, minor: 0, suggestion: 0, total: 0 };
      }
      categoryCounts[cat].total++;
      if (f.severity === 'critical') categoryCounts[cat].critical++;
      else if (f.severity === 'major') categoryCounts[cat].major++;
      else if (f.severity === 'minor') categoryCounts[cat].minor++;
      else categoryCounts[cat].suggestion++;

      const existing = groupedRulesMap.get(f.ruleId);
      if (existing) {
        existing.findings.push(f);
      } else {
        groupedRulesMap.set(f.ruleId, {
          ruleName: f.ruleName || f.ruleId,
          category: f.category || 'architecture',
          severity: f.severity,
          findings: [f],
        });
      }

      // Track Module & Class level technical debt
      const moduleName = this.extractModuleName(f.filePath);
      const fixMeta = ReportFixGenerator.getFixMetadata(f.ruleId, f.ruleName, f);
      const modRecord = moduleDebtMap.get(moduleName) || { count: 0, fixMinutes: 0 };
      modRecord.count++;
      modRecord.fixMinutes += fixMeta.estimatedFixMinutes;
      moduleDebtMap.set(moduleName, modRecord);

      const relPath = this.sanitizeFilePath(f.filePath);
      const classRecord = classRiskMap.get(relPath) || { filePath: relPath, count: 0, maxSeverity: 'minor' };
      classRecord.count++;
      if (f.severity === 'critical' || classRecord.maxSeverity !== 'critical') {
        classRecord.maxSeverity = f.severity;
      }
      classRiskMap.set(relPath, classRecord);
    }

    // Calculate Total Technical Debt (hours)
    let totalFixMinutes = 0;
    for (const [ruleId, group] of groupedRulesMap.entries()) {
      const fixMeta = ReportFixGenerator.getFixMetadata(ruleId, group.ruleName, group.findings[0]);
      totalFixMinutes += fixMeta.estimatedFixMinutes * group.findings.length;
    }
    const debtHours = (totalFixMinutes / 60).toFixed(1);

    let md = `# 🛡️ Enterprise AI Java Review Report\n\n`;
    md += `> [!IMPORTANT]\n`;
    md += `> **Executive Summary**: Evaluated **${fileCount} Java files** with an overall Quality Score of **${score.finalScore} / 100** (Grade: **${score.grade}**). Identified **${totalIssues} static findings** with an estimated remediation debt of **~${debtHours} hours**.\n\n`;

    md += `- **Generated At:** ${new Date().toLocaleString()}\n`;
    md += `- **Files Evaluated:** ${fileCount} Java files\n`;
    md += `- **Overall Score:** **${score.finalScore} / 100** (${score.grade})\n`;
    md += `- **Total Issues:** ${totalIssues} (🚨 ${criticalCount} Critical | ⚠️ ${majorCount} Major | ℹ️ ${minorCount} Minor | 💡 ${suggestionCount} Suggestion)\n`;
    if (promptFileName) {
      md += `- **Saved Prompt Artifact:** \`${promptFileName}\`  \n`;
    }
    md += `\n---\n\n`;

    // 1. Executive Summary & Health Matrix
    md += `## 📊 Executive Summary & Health Matrix\n\n`;
    md += `| Category Metric | Score | Grade | Health Status | Findings |\n`;
    md += `| :--- | :---: | :---: | :---: | :---: |\n`;
    md += `| **Overall Code Quality** | **${score.finalScore} / 100** | **${score.grade}** | ${score.finalScore >= 80 ? '✅ Healthy' : score.finalScore >= 60 ? '⚠️ Review Recommended' : '❌ Immediate Action Required'} | ${totalIssues} |\n`;
    md += `| **Architecture & Structure** | ${score.architecture.score} / 100 | - | ${score.architecture.score >= 80 ? '✅ Healthy' : '⚠️ Review Recommended'} | ${categoryCounts['architecture']?.total || 0} |\n`;
    md += `| **Security & Hardening** | ${score.security.score} / 100 | - | ${score.security.score >= 80 ? '✅ Healthy' : '❌ Vulnerabilities Found'} | ${categoryCounts['security']?.total || 0} |\n`;
    md += `| **Maintainability** | ${score.maintainability.score} / 100 | - | ${score.maintainability.score >= 80 ? '✅ Healthy' : '⚠️ Review Recommended'} | ${categoryCounts['maintainability']?.total || 0} |\n`;
    md += `| **Performance & Efficiency** | ${score.performance.score} / 100 | - | ${score.performance.score >= 80 ? '✅ Healthy' : '⚠️ Bottlenecks Detected'} | ${categoryCounts['performance']?.total || 0} |\n`;
    md += `| **Testing & Reliability** | ${score.testing.score} / 100 | - | ${score.testing.score >= 80 ? '✅ Healthy' : '⚠️ Coverage Deficit'} | ${categoryCounts['testing']?.total || 0} |\n\n`;

    // Technical Debt by Module
    if (moduleDebtMap.size > 0) {
      md += `### 🏗️ Technical Debt by Module\n\n`;
      md += `| Module Directory | Issues Found | Est. Remediation Debt |\n`;
      md += `| :--- | :---: | :---: |\n`;
      for (const [mod, data] of moduleDebtMap.entries()) {
        md += `| \`${mod}\` | ${data.count} | ~${(data.fixMinutes / 60).toFixed(1)} hours |\n`;
      }
      md += `\n`;
    }

    // Highest Risk Classes
    if (classRiskMap.size > 0) {
      md += `### 🚨 Highest Risk Classes\n\n`;
      md += `| Target Class File | Findings Count | Highest Severity |\n`;
      md += `| :--- | :---: | :---: |\n`;
      const sortedClasses = Array.from(classRiskMap.values()).sort((a, b) => b.count - a.count).slice(0, 5);
      for (const c of sortedClasses) {
        const sevBadge = c.maxSeverity === 'critical' ? '🚨 CRITICAL' : c.maxSeverity === 'major' ? '⚠️ MAJOR' : 'ℹ️ MINOR';
        md += `| \`${c.filePath}\` | **${c.count}** | ${sevBadge} |\n`;
      }
      md += `\n---\n\n`;
    }

    // 2. Grouped Issue Cards
    md += `## 🔍 Grouped Issue Analysis & Remediation Cards\n\n`;
    if (groupedRulesMap.size === 0) {
      md += `🎉 **Zero static code analysis issues detected!** All automated rule checks passed cleanly.\n\n`;
    } else {
      const severityOrder: Record<string, number> = { critical: 1, major: 2, minor: 3, suggestion: 4 };
      const sortedGroups = Array.from(groupedRulesMap.entries()).sort((a, b) => {
        const pA = severityOrder[a[1].severity] || 5;
        const pB = severityOrder[b[1].severity] || 5;
        if (pA !== pB) return pA - pB;
        return b[1].findings.length - a[1].findings.length;
      });

      for (const [ruleId, group] of sortedGroups) {
        const sampleFinding = group.findings[0];
        const fixMeta = ReportFixGenerator.getFixMetadata(ruleId, group.ruleName, sampleFinding);
        const sevBadge = group.severity === 'critical' ? '🚨 [CRITICAL]' : group.severity === 'major' ? '⚠️ [MAJOR]' : 'ℹ️ [MINOR]';

        md += `### Card: \`${ruleId}\` — ${fixMeta.ruleName}\n\n`;
        md += `| Attribute | Details |\n`;
        md += `| :--- | :--- |\n`;
        md += `| **Severity / Category** | ${sevBadge} (${group.category.toUpperCase()}) |\n`;
        md += `| **Risk Level** | **${fixMeta.riskLevel}** |\n`;
        md += `| **Total Occurrences** | **${group.findings.length} file location(s)** |\n`;
        md += `| **Discovery Source** | Static Rule Engine (\`getStaticFindings()\`) |\n`;
        md += `| **Detection Logic** | ${fixMeta.detectionLogic} |\n`;
        md += `| **Auto-Fix Classification** | **${fixMeta.autoFixType}** |\n`;
        md += `| **Confidence Score** | **${fixMeta.confidenceScore}%** |\n`;
        md += `| **Est. Remediation Time** | ~${fixMeta.estimatedFixMinutes * group.findings.length} mins |\n\n`;

        // Confidence Reasons
        md += `#### 🔍 Confidence Score Reasoning (${fixMeta.confidenceScore}%)\n`;
        for (const reason of fixMeta.confidenceReasons) {
          md += `- ${reason}\n`;
        }
        md += `\n`;

        // Root Cause & Business/Technical Impact
        md += `#### 🧠 Root Cause Analysis & Impact\n`;
        md += `- **Why Rule Triggered**: ${fixMeta.detectionLogic}\n`;
        md += `- **Business Impact**: ${fixMeta.businessImpact}\n`;
        md += `- **Technical Impact**: ${fixMeta.technicalRationale}\n\n`;

        // Affected File Locations
        md += `#### 📍 Affected Workspace Locations (${group.findings.length})\n`;
        for (const f of group.findings.slice(0, 10)) {
          const relPath = this.sanitizeFilePath(f.filePath);
          md += `- \`${relPath}:${f.lineNumber}\` — ${f.message}\n`;
        }
        if (group.findings.length > 10) {
          md += `- ... and ${group.findings.length - 10} additional occurrences in workspace.\n`;
        }
        md += `\n`;

        // Code Snippet Evidence
        const activeFindingWithSnippet = group.findings.find(f => f.codeSnippet) || sampleFinding;
        if (activeFindingWithSnippet?.codeSnippet) {
          md += `#### 🔍 Real Source Code Evidence Snippet\n`;
          md += `\`\`\`java\n${activeFindingWithSnippet.codeSnippet}\n\`\`\`\n\n`;
        }

        // Before & After Fix Examples & Unified Diff
        if (fixMeta.beforeSnippet && fixMeta.afterSnippet) {
          md += `#### 🛠️ Real Code Fix & Unified Diff\n\n`;
          md += `**Before Fix (Non-compliant):**\n`;
          md += `\`\`\`java\n${fixMeta.beforeSnippet}\n\`\`\`\n\n`;
          md += `**After Fix (Compliant):**\n`;
          md += `\`\`\`java\n${fixMeta.afterSnippet}\n\`\`\`\n\n`;
        }

        if (fixMeta.diffSnippet) {
          md += `**Unified Diff:**\n`;
          md += `\`\`\`diff\n${fixMeta.diffSnippet}\n\`\`\`\n\n`;
        }

        // Authoritative References
        if (fixMeta.references && fixMeta.references.length > 0) {
          md += `#### 📚 Enterprise References & Guidelines\n`;
          for (const ref of fixMeta.references) {
            md += `- [${ref.title}](${ref.url || '#'})  \n`;
          }
          md += `\n`;
        }

        md += `---\n\n`;
      }
    }

    // 3. AI Architectural Analysis
    md += `## 🤖 AI Architectural Analysis & Recommendations\n\n`;
    md += aiContent + `\n\n---\n\n`;

    // 4. Prioritized Remediation Roadmap
    md += `## 🗺️ Prioritized Remediation Roadmap & Sprint Plan\n\n`;
    md += `| Phase | Focus Area | Key Actions | Est. Effort |\n`;
    md += `| :--- | :--- | :--- | :---: |\n`;

    const secCount = categoryCounts['security']?.total || 0;
    const archCount = categoryCounts['architecture']?.total || 0;
    const perfCount = categoryCounts['performance']?.total || 0;
    const qualCount = (categoryCounts['maintainability']?.total || 0) + (categoryCounts['quality']?.total || 0);

    md += `| **Phase 1 (Immediate)** | **Security & Secrets** | Remediate hardcoded secrets, externalize API credentials, enforce @Valid on controller parameters. | ~${secCount * 15} mins |\n`;
    md += `| **Phase 2 (Short-term)** | **Architecture & DI** | Replace @Autowired field injection with final constructor injection; add @Transactional to service write operations. | ~${archCount * 10} mins |\n`;
    md += `| **Phase 3 (Medium-term)** | **Performance & Queries** | Refactor N+1 database queries in loops, implement Pageable pagination on findAll calls. | ~${perfCount * 20} mins |\n`;
    md += `| **Phase 4 (Long-term)** | **Code Quality & Logging** | Replace System.out.println with SLF4J loggers, clean up unused Spring beans. | ~${qualCount * 5} mins |\n\n`;

    return md;
  }

  private sanitizeFilePath(filePath: string): string {
    if (!filePath) return '';
    const clean = filePath.replace(/\\/g, '/');
    const srcIdx = clean.toLowerCase().indexOf('src/');
    if (srcIdx !== -1) {
      return clean.slice(srcIdx);
    }
    const parts = clean.split('/').filter(Boolean);
    return parts.slice(-3).join('/');
  }

  private extractModuleName(filePath: string): string {
    if (!filePath) return 'root';
    const clean = filePath.replace(/\\/g, '/');
    const parts = clean.split('/').filter(Boolean);
    const srcIdx = parts.indexOf('src');
    if (srcIdx > 0) {
      return parts[srcIdx - 1];
    }
    return parts[0] || 'root';
  }
}
