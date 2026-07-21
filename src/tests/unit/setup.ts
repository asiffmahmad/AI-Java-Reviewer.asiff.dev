import * as Module from 'module';
import { vscodeMock } from './mocks/vscode';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const originalRequire = (Module as any).prototype.require;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Module as any).prototype.require = function(path: string) {
  if (path === 'vscode') {
    return vscodeMock;
  }
  return originalRequire.apply(this, arguments);
};
