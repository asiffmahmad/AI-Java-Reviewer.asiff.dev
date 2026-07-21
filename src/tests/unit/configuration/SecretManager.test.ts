import * as assert from 'assert';
import { SecretManager } from '../../../configuration/SecretManager';

describe('SecretManager', () => {
  let store: Record<string, string> = {};
  
  const mockSecretStorage = {
    get: async (key: string) => store[key],
    store: async (key: string, value: string) => { store[key] = value; },
    delete: async (key: string) => { delete store[key]; },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onDidChange: {} as any,
    keys: async () => Object.keys(store)
  };

  const secretManager = new SecretManager(mockSecretStorage);

  beforeEach(() => {
    store = {};
  });

  it('should store and retrieve key', async () => {
    await mockSecretStorage.store('aijavareviewer.openai.apiKey', 'sk-123');
    const key = await secretManager.getKey('openai');
    assert.strictEqual(key, 'sk-123');
  });

  it('should delete key', async () => {
    await mockSecretStorage.store('aijavareviewer.openai.apiKey', 'sk-123');
    await secretManager.clearKey('openai');
    const key = await secretManager.getKey('openai');
    assert.strictEqual(key, undefined);
  });
});
