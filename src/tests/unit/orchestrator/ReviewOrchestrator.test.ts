import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { ReviewOrchestrator } from '../../../orchestrator/ReviewOrchestrator';
import { Logger } from '../../../utils/Logger';
import { ConfigurationLoader } from '../../../configuration/ConfigurationLoader';
import { FileUtils } from '../../../utils/FileUtils';

describe('ReviewOrchestrator', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('runs review successfully with fallback report when vscode-lm has no models', async () => {
    const mockChannel = {
      appendLine: () => {},
      show: () => {},
      dispose: () => {},
    } as any;
    const logger = Logger.initialize(mockChannel);
    const secretManager = { getKey: sinon.stub().resolves(undefined) } as any;
    const orchestrator = new ReviewOrchestrator(logger, secretManager);

    // Mock workspace folder pointing to actual existing directory
    sinon.stub(vscode.workspace, 'workspaceFolders' as any).get(() => [
      { uri: { fsPath: __dirname } }
    ]);

    // Stub configuration loader to return provider: 'vscode-lm'
    sinon.stub(ConfigurationLoader.prototype, 'load').resolves({
      provider: 'vscode-lm',
      model: 'auto',
      outputDir: '.review-ai/reports',
      rules: [],
      ruleOverrides: [],
      severity: {},
    } as any);

    // Stub workspace findFiles to return mock java file
    sinon.stub(vscode.workspace, 'findFiles' as any).resolves([
      { fsPath: `${__dirname}/TestController.java` }
    ]);

    // Stub FileUtils
    sinon.stub(FileUtils, 'readText').resolves('public class TestController {}');
    sinon.stub(FileUtils, 'writeText').resolves();

    // Stub selectChatModels to return empty
    sinon.stub(vscode.lm, 'selectChatModels').resolves([]);

    const showInformationMessageStub = sinon.stub(vscode.window, 'showInformationMessage').resolves();
    sinon.stub(vscode.workspace, 'openTextDocument' as any).resolves({} as any);
    sinon.stub(vscode.window, 'showTextDocument' as any).resolves({} as any);

    await orchestrator.runReview();

    assert.ok(showInformationMessageStub.calledOnce);
  });
});
