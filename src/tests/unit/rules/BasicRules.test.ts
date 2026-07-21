import * as assert from 'assert';
import { FieldInjectionRule } from '../../../rules/FieldInjectionRule';
import { SystemOutPrintlnRule } from '../../../rules/SystemOutPrintlnRule';
import type { IJavaClass } from '../../../models';
import { DEFAULT_REVIEW_CONFIG } from '../../../configuration/ReviewConfig';

describe('BasicRules', () => {
  it('FieldInjectionRule detects @Autowired on fields', () => {
    const rule = new FieldInjectionRule();
    const mockClass = {
      stereotype: 'Service',
      fields: [{ name: 'userService', injectionType: 'field', lineNumber: 10, rawSource: '@Autowired private UserService userService;' }]
    } as IJavaClass;

    const findings = rule.evaluate(mockClass, DEFAULT_REVIEW_CONFIG);
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].ruleId, 'RULE_FIELD_INJECTION');
  });

  it('SystemOutPrintlnRule detects raw stdout', () => {
    const rule = new SystemOutPrintlnRule();
    const mockClass = {
      methods: [{ name: 'doWork', body: 'System.out.println("Hello");', lineNumber: 20 }]
    } as IJavaClass;

    const findings = rule.evaluate(mockClass, DEFAULT_REVIEW_CONFIG);
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].ruleId, 'RULE_SYSTEM_OUT_PRINTLN');
  });
});
