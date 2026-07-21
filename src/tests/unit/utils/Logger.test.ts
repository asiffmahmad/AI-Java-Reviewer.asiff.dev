import * as assert from 'assert';
import { Logger } from '../../../utils/Logger';

describe('Logger', () => {
  let lines: string[] = [];
  const mockChannel = {
    name: 'test',
    append: () => {},
    appendLine: (line: string) => { lines.push(line); },
    replace: () => {},
    clear: () => {},
    show: () => {},
    hide: () => {},
    dispose: () => {},
  };

  beforeEach(() => {
    lines = [];
    try {
      Logger.getInstance().dispose();
    } catch {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Logger.initialize(mockChannel as any);
  });

  afterEach(() => {
    Logger.getInstance().dispose();
  });

  it('should initialize and log INFO', () => {
    const logger = Logger.getInstance();
    logger.info('Test info message');
    assert.strictEqual(lines.length, 1);
    assert.ok(lines[0].includes('[INFO ] Test info message'));
  });

  it('should not log DEBUG by default', () => {
    const logger = Logger.getInstance();
    logger.debug('Test debug message');
    assert.strictEqual(lines.length, 0);
  });

  it('should log DEBUG when enabled', () => {
    const logger = Logger.getInstance();
    logger.enableDebug();
    logger.debug('Test debug message');
    assert.strictEqual(lines.length, 1);
    assert.ok(lines[0].includes('[DEBUG] Test debug message'));
  });

  it('should log context objects', () => {
    const logger = Logger.getInstance();
    logger.info('Context:', { key: 'value' });
    assert.strictEqual(lines.length, 2);
    assert.ok(lines[0].includes('[INFO ] Context:'));
    assert.ok(lines[1].includes('"key": "value"'));
  });
});
