import * as assert from 'assert';
import * as sinon from 'sinon';
import { OpenAIProvider } from '../../../../ai/providers/OpenAIProvider';

describe('AI Providers', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('OpenAIProvider parses response correctly', async () => {
    const provider = new OpenAIProvider('fake-key', 'gpt-4');
    
    // Stub the protected post method on the instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const postStub = sinon.stub(provider as any, 'post').resolves(
      JSON.stringify({
        choices: [{ message: { content: 'This is a mock OpenAI review' } }]
      })
    );

    const review = await provider.generateReview('Prompt');
    
    assert.strictEqual(review, 'This is a mock OpenAI review');
    assert.ok(postStub.calledOnce);
  });
});
