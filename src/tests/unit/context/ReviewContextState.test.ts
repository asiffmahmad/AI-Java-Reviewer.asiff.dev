import * as assert from 'assert';
import { ReviewContextState } from '../../../context/ReviewContextState';

describe('ReviewContextState', () => {
  it('tracks visited files and visited methods', () => {
    const state = new ReviewContextState();
    state.markFileVisited('src/main/java/com/example/UserService.java');
    state.markMethodVisited('UserService', 'getUser');

    assert.strictEqual(state.visitedFiles.size, 1);
    assert.ok(state.visitedFiles.has('src/main/java/com/example/UserService.java'));
    assert.strictEqual(state.visitedMethods.size, 1);
    assert.ok(state.visitedMethods.has('UserService.getUser'));
  });

  it('records tool execution history and prevents duplicate execution checks', () => {
    const state = new ReviewContextState();
    state.recordToolExecution('readFile', { path: 'UserService.java' });

    assert.strictEqual(state.toolHistory.length, 1);
    assert.strictEqual(state.toolHistory[0].toolName, 'readFile');
    assert.ok(state.hasExecutedTool('readFile'));
    assert.ok(state.hasExecutedTool('readFile', JSON.stringify({ path: 'UserService.java' })));
    assert.strictEqual(state.hasExecutedTool('getViolations'), false);
  });
});
