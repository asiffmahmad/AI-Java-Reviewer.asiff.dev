import * as assert from 'assert';
import { ReportFormatter } from '../../../ai/ReportFormatter';
import { ReportFixGenerator } from '../../../ai/ReportFixGenerator';
import type { IFinding, IProjectScore } from '../../../models';

describe('Enterprise ReportFormatter & ReportFixGenerator', () => {
  it('ReportFixGenerator returns fix metadata for RULE_FIELD_INJECTION', () => {
    const fix = ReportFixGenerator.getFixMetadata('RULE_FIELD_INJECTION');
    assert.strictEqual(fix.ruleId, 'RULE_FIELD_INJECTION');
    assert.strictEqual(fix.autoFixType, 'Fully Automatic');
    assert.strictEqual(fix.confidenceScore, 98);
    assert.ok(fix.beforeSnippet?.includes('UserRepository'));
    assert.ok(fix.afterSnippet?.includes('UserRepository'));
    assert.ok(fix.diffSnippet?.includes('@@'));
  });

  it('ReportFormatter formats enterprise report with grouped issue cards and unified diffs', () => {
    const formatter = new ReportFormatter();

    const mockScore: IProjectScore = {
      finalScore: 75,
      grade: 'C',
      architecture: { category: 'architecture', score: 70, maxScore: 100, percentage: 70, deductions: [] },
      security: { category: 'security', score: 60, maxScore: 100, percentage: 60, deductions: [] },
      maintainability: { category: 'maintainability', score: 80, maxScore: 100, percentage: 80, deductions: [] },
      performance: { category: 'performance', score: 85, maxScore: 100, percentage: 85, deductions: [] },
      testing: { category: 'testing', score: 80, maxScore: 100, percentage: 80, deductions: [] },
    };

    const mockFindings: IFinding[] = [
      {
        ruleId: 'RULE_FIELD_INJECTION',
        ruleName: 'Field Injection via @Autowired Detected',
        severity: 'major',
        category: 'architecture',
        message: 'Field injection used on userRepository',
        recommendation: 'Use constructor injection',
        filePath: 'src/main/java/com/example/service/UserService.java',
        lineNumber: 12,
        scoreDeduction: 5,
        codeSnippet: '@Autowired private UserRepository userRepository;',
      },
      {
        ruleId: 'RULE_FIELD_INJECTION',
        ruleName: 'Field Injection via @Autowired Detected',
        severity: 'major',
        category: 'architecture',
        message: 'Field injection used on orderRepository',
        recommendation: 'Use constructor injection',
        filePath: 'src/main/java/com/example/service/OrderService.java',
        lineNumber: 14,
        scoreDeduction: 5,
        codeSnippet: '@Autowired private OrderRepository orderRepository;',
      },
    ];

    const report = formatter.format(mockScore, mockFindings, 'AI architectural deep-dive analysis goes here.', 2);

    assert.ok(report.includes('# 🛡️ Enterprise AI Java Review Report'));
    assert.ok(report.includes('Executive Summary & Health Matrix'));
    assert.ok(report.includes('Grouped Issue Analysis & Remediation Cards'));
    assert.ok(report.includes('Card: `RULE_FIELD_INJECTION`'));
    assert.ok(report.includes('| **Total Occurrences** | **2 file location(s)** |'));
    assert.ok(report.includes('Unified Diff:'));
    assert.ok(report.includes('Prioritized Remediation Roadmap'));
  });
});
