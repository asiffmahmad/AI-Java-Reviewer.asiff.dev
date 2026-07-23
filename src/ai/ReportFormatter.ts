import * as path from 'path';
import type { IFinding, IProjectScore } from '../models';

export class ReportFormatter {
  /**
   * Formats the final Code Review Markdown report into a professional executive layout.
   */
  public format(
    score: IProjectScore,
    findings: IFinding[],
    aiContent: string,
    fileCount: number,
    promptFileName?: string
  ): string {
    const totalIssues = findings.length;

    // Categorize findings
    const categoryCounts: Record<string, { critical: number; major: number; minor: number; suggestion: number; total: number }> = {};
    for (const f of findings) {
      const cat = f.category || 'general';
      if (!categoryCounts[cat]) {
        categoryCounts[cat] = { critical: 0, major: 0, minor: 0, suggestion: 0, total: 0 };
      }
      categoryCounts[cat].total++;
      if (f.severity === 'critical') categoryCounts[cat].critical++;
      else if (f.severity === 'major') categoryCounts[cat].major++;
      else if (f.severity === 'minor') categoryCounts[cat].minor++;
      else categoryCounts[cat].suggestion++;
    }

    let md = `# 🛡️ Enterprise AI Java Review Report\n\n`;
    md += `> **Generated:** ${new Date().toLocaleString()}  \n`;
    md += `> **Files Evaluated:** ${fileCount} Java files  \n`;
    md += `> **Overall Score:** **${score.finalScore} / 100** (Grade: **${score.grade}**)  \n`;
    md += `> **Total Static Analysis Issues:** **${totalIssues}**\n\n`;

    if (promptFileName) {
      md += `> 📝 **Prompt Backup Artifact**: The full AI prompt with complete code context is saved in \`${promptFileName}\` for easy copy-pasting into Web AI interfaces.\n\n`;
    }

    md += `---\n\n`;

    // 1. Executive Scorecard Table
    md += `## 📊 Executive Scorecard\n\n`;
    md += `| Category Metric | Score | Grade | Status |\n`;
    md += `| :--- | :---: | :---: | :---: |\n`;
    md += `| **Overall Quality Score** | **${score.finalScore} / 100** | **${score.grade}** | ${score.finalScore >= 80 ? '✅ Pass' : score.finalScore >= 60 ? '⚠️ Warning' : '❌ Needs Attention'} |\n`;
    md += `| **Architecture & Structure** | ${score.architecture.score} / 100 | - | ${score.architecture.score >= 80 ? '✅ Good' : '⚠️ Review Needed'} |\n`;
    md += `| **Security & Hardening** | ${score.security.score} / 100 | - | ${score.security.score >= 80 ? '✅ Good' : '❌ Vulnerability Risk'} |\n`;
    md += `| **Maintainability** | ${score.maintainability.score} / 100 | - | ${score.maintainability.score >= 80 ? '✅ Good' : '⚠️ Review Needed'} |\n`;
    md += `| **Performance & Efficiency** | ${score.performance.score} / 100 | - | ${score.performance.score >= 80 ? '✅ Good' : '⚠️ Review Needed'} |\n`;
    md += `| **Testing & Reliability** | ${score.testing.score} / 100 | - | ${score.testing.score >= 80 ? '✅ Good' : '⚠️ Needs Tests'} |\n\n`;

    // 2. Issue Summary Table
    md += `## ⚠️ Issues Summary by Category\n\n`;
    if (Object.keys(categoryCounts).length === 0) {
      md += `🎉 **No static code analysis issues were detected!** All automated rule checks passed cleanly.\n\n`;
    } else {
      md += `| Issue Category | Total Issues | Critical | Major | Minor | Suggestion |\n`;
      md += `| :--- | :---: | :---: | :---: | :---: | :---: |\n`;
      for (const [cat, counts] of Object.entries(categoryCounts)) {
        const catName = cat.charAt(0).toUpperCase() + cat.slice(1);
        md += `| **${catName}** | ${counts.total} | ${counts.critical > 0 ? `🚨 ${counts.critical}` : '0'} | ${counts.major > 0 ? `⚠️ ${counts.major}` : '0'} | ${counts.minor > 0 ? `ℹ️ ${counts.minor}` : '0'} | ${counts.suggestion > 0 ? `💡 ${counts.suggestion}` : '0'} |\n`;
      }
      md += `\n`;
    }

    // 3. Detailed Code Findings List
    md += `## 🔍 Detailed Code Findings\n\n`;
    if (findings.length === 0) {
      md += `*No automated static analysis rule violations found.*\n\n`;
    } else {
      findings.forEach((f, idx) => {
        let severityBadge = '💡 **SUGGESTION**';
        if (f.severity === 'critical') severityBadge = '🚨 **CRITICAL**';
        else if (f.severity === 'major') severityBadge = '⚠️ **MAJOR**';
        else if (f.severity === 'minor') severityBadge = 'ℹ️ **MINOR**';

        const fileBasename = path.basename(f.filePath);
        const relPath = this.sanitizeFilePath(f.filePath);
        md += `### Issue #${idx + 1}: ${f.message} (${severityBadge})\n\n`;
        md += `- **Category:** \`${f.category}\`  \n`;
        md += `- **File Location:** \`${fileBasename}\` (Line ${f.lineNumber})  \n`;
        md += `- **Relative Path:** \`${relPath}\`  \n`;
        md += `- **Rule Reference:** \`${f.ruleId}\`  \n`;
        md += `- **Actionable Recommendation:** ${f.recommendation}\n\n`;
      });
    }

    md += `---\n\n`;

    // 4. AI Deep-Dive Analysis
    md += `## 🤖 AI Architectural Analysis & Recommendations\n\n`;
    md += aiContent.trim();
    md += `\n\n---\n\n`;
    md += `### 📝 Web AI Prompt Artifact\n`;
    md += `If your organization restricts direct IDE AI model communication, open the companion prompt file in this folder:\n`;
    if (promptFileName) {
      md += `- **File Path:** \`${promptFileName}\`\n\n`;
    } else {
      md += `- **File Path:** \`prompt-<timestamp>.md\`\n\n`;
    }
    md += `Copy and paste its content directly into **Antigravity Chat**, **Google Gemini**, **ChatGPT**, or **Claude Web**.\n`;

    return md;
  }

  private sanitizeFilePath(filePath: string): string {
    if (!filePath) return '';
    const clean = filePath.replace(/\\/g, '/');
    const srcIdx = clean.toLowerCase().indexOf('/src/');
    if (srcIdx !== -1) return clean.slice(srcIdx + 1);
    const parts = clean.split('/').filter(Boolean);
    return parts.length > 3 ? parts.slice(-3).join('/') : parts.join('/');
  }
}
