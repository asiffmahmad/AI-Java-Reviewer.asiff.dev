import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { VSCodeLMProvider } from '../../../../ai/providers/VSCodeLMProvider';
import { LLMProviderFactory } from '../../../../ai/LLMProviderFactory';

describe('VSCodeLMProvider', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('LLMProviderFactory instantiates VSCodeLMProvider for vscode-lm provider', () => {
    const provider = LLMProviderFactory.createProvider('vscode-lm', '', 'gpt-4o');
    assert.ok(provider instanceof VSCodeLMProvider);
  });

  it('returns structured fallback review if vscode.lm is not available', async () => {
    const provider = new VSCodeLMProvider('gpt-4o');
    const originalSelect = vscode.lm.selectChatModels;
    try {
      (vscode.lm as any).selectChatModels = undefined;
      const review = await provider.generateReview('Test Prompt');
      assert.ok(review.includes('VS Code Language Model API (vscode.lm) is not supported'));
      assert.ok(review.includes('Recommended Solutions'));
    } finally {
      (vscode.lm as any).selectChatModels = originalSelect;
    }
  });

  it('returns fallback review when no chat models are returned', async () => {
    const provider = new VSCodeLMProvider('gpt-4o');
    sinon.stub(vscode.lm, 'selectChatModels').resolves([]);

    const review = await provider.generateReview('Test Prompt');
    assert.ok(review.includes('No active VS Code Chat models detected in your IDE'));
    assert.ok(review.includes('Recommended Solutions'));
  });

  it('sends prompt and collects response text from chat model', async () => {
    const provider = new VSCodeLMProvider('gpt-4o');

    async function* asyncGenerator() {
      yield 'Chunk 1 ';
      yield 'Chunk 2 ';
      yield 'Review Complete';
    }

    const mockResponse = {
      text: asyncGenerator(),
    };

    const mockModel = {
      sendRequest: sinon.stub().resolves(mockResponse),
    };

    const selectStub = sinon.stub(vscode.lm, 'selectChatModels').resolves([mockModel as any]);

    const result = await provider.generateReview('Code review prompt');

    assert.strictEqual(result, 'Chunk 1 Chunk 2 Review Complete');
    assert.ok(selectStub.calledWith({ family: 'gpt-4o' }));
    assert.ok(mockModel.sendRequest.calledOnce);
  });
});
