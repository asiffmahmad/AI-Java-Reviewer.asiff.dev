import * as assert from 'assert';
import { ReviewAgent } from '../../../ai/ReviewAgent';
import { RuleEngine } from '../../../rules/RuleEngine';
import { ScoreCalculator } from '../../../scoring/ScoreCalculator';
import { DEFAULT_REVIEW_CONFIG } from '../../../configuration/ReviewConfig';

describe('ReviewAgent', () => {
  it('orchestrates the review process using mock provider and minimal promptText', async () => {
    const engine = new RuleEngine();
    const calculator = new ScoreCalculator();
    const agent = new ReviewAgent(engine, calculator);

    const config = {
      ...DEFAULT_REVIEW_CONFIG,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      provider: 'mock' as any,
    };

    const { reportMarkdown, promptText } = await agent.executeReview([], [], config, 'fake-key');

    assert.ok(reportMarkdown.includes('Mock Review'));
    assert.ok(promptText.includes('# AI Java Reviewer'));
    assert.ok(promptText.includes('readFile(path)'));
    assert.strictEqual(promptText.includes('public class'), false);
    assert.ok(promptText.length < 5000);
  });
});
