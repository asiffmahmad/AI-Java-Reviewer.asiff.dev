/**
 * Basic VS Code API mock for unit tests.
 * This file is loaded by Mocha before tests run, or explicitly required in tests.
 */
export const vscodeMock = {
  window: {
    createOutputChannel: () => ({
      appendLine: () => {},
      show: () => {},
      dispose: () => {},
    }),
    showInputBox: async () => 'mock-input',
    showInformationMessage: async () => {},
    showWarningMessage: async () => {},
    showErrorMessage: async () => {},
    showTextDocument: async () => {},
    withProgress: async (_options: unknown, task: (p: unknown) => Promise<void>) => {
      await task({ report: () => {} });
    }
  },
  commands: {
    registerCommand: () => ({ dispose: () => {} }),
    executeCommand: async () => {}
  },
  workspace: {
    getConfiguration: () => ({
      get: () => undefined
    }),
    findFiles: async () => [],
    openTextDocument: async () => ({}),
    workspaceFolders: undefined
  },
  Uri: {
    file: (f: string) => ({ fsPath: f })
  },
  ProgressLocation: {
    Notification: 15
  },
  lm: {
    selectChatModels: async () => []
  },
  LanguageModelChatMessage: {
    User: (content: string) => ({ role: 1, content }),
    Assistant: (content: string) => ({ role: 2, content }),
  },
  RelativePattern: class {
    constructor(public base: string, public pattern: string) {}
  },
  CancellationTokenSource: class {
    token = {};
    cancel() {}
    dispose() {}
  }
};

// Make it available globally if tests import 'vscode' using something like proxyquire
// But for our tests, we will inject dependencies where possible.
