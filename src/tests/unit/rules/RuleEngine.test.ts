import * as assert from 'assert';
import { RuleEngine } from '../../../rules/RuleEngine';
import type { IRule } from '../../../rules/IRule';
import type { IJavaClass, IFinding, RuleCategory, Severity } from '../../../models';
import { DEFAULT_REVIEW_CONFIG } from '../../../configuration/ReviewConfig';

class DummyRule implements IRule {
  public id = 'DUMMY_RULE';
  public name = 'Dummy Rule';
  public category: RuleCategory = 'architecture';
  public defaultSeverity: Severity = 'minor';

  public evaluate(javaClass: IJavaClass): IFinding[] {
    return [{
      ruleId: this.id,
      ruleName: this.name,
      severity: this.defaultSeverity,
      category: this.category,
      message: 'Found an issue',
      recommendation: 'Fix it',
      filePath: javaClass.filePath,
      lineNumber: 1,
      scoreDeduction: 0,
    }];
  }
}

describe('RuleEngine', () => {
  const engine = new RuleEngine();
  const rule = new DummyRule();
  engine.registerRule(rule);

  const mockClass = {
    filePath: 'Test.java',
    className: 'Test',
  } as IJavaClass;

  it('should evaluate registered rules', () => {
    const findings = engine.evaluate([mockClass], DEFAULT_REVIEW_CONFIG);
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].ruleId, 'DUMMY_RULE');
  });

  it('should ignore disabled rules based on config', () => {
    const config = {
      ...DEFAULT_REVIEW_CONFIG,
      ruleOverrides: [{ id: 'DUMMY_RULE', enabled: false }]
    };
    const findings = engine.evaluate([mockClass], config);
    assert.strictEqual(findings.length, 0);
  });

  it('should apply severity override from config', () => {
    const config = {
      ...DEFAULT_REVIEW_CONFIG,
      ruleOverrides: [{ id: 'DUMMY_RULE', enabled: true, severity: 'critical' as Severity }]
    };
    const findings = engine.evaluate([mockClass], config);
    assert.strictEqual(findings[0].severity, 'critical');
  });
});
