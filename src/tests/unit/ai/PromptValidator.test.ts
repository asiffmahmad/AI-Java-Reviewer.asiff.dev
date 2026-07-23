import * as assert from 'assert';
import { PromptValidator } from '../../../ai/PromptValidator';

describe('PromptValidator', () => {
  it('sanitizes absolute paths from prompt text', () => {
    const rawPrompt = 'File: /Users/asiff/Documents/projects/backend/src/main/java/com/example/UserService.java\nCode content...';
    const cleaned = PromptValidator.validateAndSanitize(rawPrompt);

    assert.strictEqual(cleaned.includes('/Users/asiff/Documents/projects/backend'), false);
    assert.ok(cleaned.includes('src/main/java/com/example/UserService.java'));
  });

  it('redacts secret tokens if present in prompt text', () => {
    const rawPrompt = 'String apiKey = "sk-proj-1234567890abcdef1234567890abcdef";';
    const cleaned = PromptValidator.validateAndSanitize(rawPrompt);

    assert.strictEqual(cleaned.includes('sk-proj-1234567890abcdef1234567890abcdef'), false);
    assert.ok(cleaned.includes('[REDACTED_SECRET_TOKEN]'));
  });

  it('deduplicates rule list entries', () => {
    const rawPrompt =
      '## Organizational Rules\n' +
      'Rules to enforce:\n' +
      '- no field injection\n' +
      '- no field injection\n' +
      '- use constructor injection\n\n' +
      '## Task\nReview code.';

    const cleaned = PromptValidator.validateAndSanitize(rawPrompt);
    const occurrences = (cleaned.match(/- no field injection/g) || []).length;

    assert.strictEqual(occurrences, 1);
  });

  it('fixes missing code fence language tags', () => {
    const rawPrompt = '### src/main/java/com/example/UserService.java\n```\npublic class UserService {}\n```\n\n## Task\nReview code.';
    const cleaned = PromptValidator.validateAndSanitize(rawPrompt);

    assert.ok(cleaned.includes('### src/main/java/com/example/UserService.java\n```java\n'));
  });
});
