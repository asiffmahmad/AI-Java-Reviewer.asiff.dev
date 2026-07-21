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
    workspaceFolders: undefined
  },
  Uri: {
    file: (f: string) => ({ fsPath: f })
  },
  ProgressLocation: {
    Notification: 15
  }
};

// Make it available globally if tests import 'vscode' using something like proxyquire
// But for our tests, we will inject dependencies where possible.
