import * as assert from 'assert';
import { ScoreCalculator } from '../../../scoring/ScoreCalculator';
import type { IFinding } from '../../../models';

describe('ScoreCalculator', () => {
  const calculator = new ScoreCalculator();

  it('calculates perfect score when no findings', () => {
    const score = calculator.calculate([]);
    assert.strictEqual(score.finalScore, 100);
    assert.strictEqual(score.grade, 'A');
    assert.strictEqual(score.architecture.score, 100);
  });

  it('deducts points and maps categories', () => {
    const findings: IFinding[] = [
      {
        ruleId: 'TEST1',
        category: 'architecture',
        scoreDeduction: 10,
        message: 'Bad arch',
      } as IFinding,
      {
        ruleId: 'TEST2',
        category: 'quality', // maps to maintainability
        scoreDeduction: 20,
        message: 'Bad quality',
      } as IFinding
    ];

    const score = calculator.calculate(findings);
    
    assert.strictEqual(score.architecture.score, 90);
    assert.strictEqual(score.maintainability.score, 80);
    
    // Architecture weight: 0.25 (90 * 0.25 = 22.5)
    // Security weight: 0.25 (100 * 0.25 = 25)
    // Performance weight: 0.20 (100 * 0.20 = 20)
    // Maintainability weight: 0.20 (80 * 0.20 = 16)
    // Testing weight: 0.10 (100 * 0.10 = 10)
    // Total = 22.5 + 25 + 20 + 16 + 10 = 93.5

    assert.strictEqual(score.finalScore, 93.5);
    assert.strictEqual(score.grade, 'A');
  });

  it('clamps scores to zero and correctly assigns failing grade', () => {
    const findings: IFinding[] = [
      {
        ruleId: 'TEST_HEAVY',
        category: 'security',
        scoreDeduction: 200, // Should clamp category to 0
        message: 'Fatal flaw',
      } as IFinding,
      {
        ruleId: 'TEST_ARCH',
        category: 'architecture',
        scoreDeduction: 50,
        message: 'Half broken',
      } as IFinding
    ];

    const score = calculator.calculate(findings);
    assert.strictEqual(score.security.score, 0);
    assert.strictEqual(score.architecture.score, 50);

    // Arch: 50 * 0.25 = 12.5
    // Sec: 0 * 0.25 = 0
    // Perf: 100 * 0.20 = 20
    // Maint: 100 * 0.20 = 20
    // Test: 100 * 0.10 = 10
    // Total = 12.5 + 0 + 20 + 20 + 10 = 62.5 -> Grade D

    assert.strictEqual(score.finalScore, 62.5);
    assert.strictEqual(score.grade, 'D');
  });
});
