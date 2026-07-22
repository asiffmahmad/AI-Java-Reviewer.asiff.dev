import type { ILLMProvider } from '../ILLMProvider';
import { BaseHttpProvider } from './BaseHttpProvider';

export class AnthropicProvider extends BaseHttpProvider implements ILLMProvider {
  private apiKey: string;
  private model: string;
  private endpoint = 'https://api.anthropic.com/v1/messages';

  constructor(apiKey: string, model: string) {
    super();
    this.apiKey = apiKey;
    this.model = model;
  }

  public async generateReview(prompt: string): Promise<string> {
    const payload = {
      model: this.model,
      max_tokens: 4096,
      temperature: 0.0,
      messages: [{ role: 'user', content: prompt }]
    };

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01'
    };

    try {
      const response = await this.post(this.endpoint, headers, JSON.stringify(payload));
      const json = JSON.parse(response);
      return json.content?.[0]?.text || '';
    } catch (error: unknown) {
      throw new Error(`Anthropic API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
