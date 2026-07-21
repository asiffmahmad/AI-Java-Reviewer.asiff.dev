import type { ILLMProvider } from '../ILLMProvider';
import { BaseHttpProvider } from './BaseHttpProvider';

export class OpenAIProvider extends BaseHttpProvider implements ILLMProvider {
  private apiKey: string;
  private model: string;
  private endpoint = 'https://api.openai.com/v1/chat/completions';

  constructor(apiKey: string, model: string) {
    super();
    this.apiKey = apiKey;
    this.model = model;
  }

  public async generateReview(prompt: string): Promise<string> {
    const payload = {
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    };

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };

    try {
      const response = await this.post(this.endpoint, headers, JSON.stringify(payload));
      const json = JSON.parse(response);
      return json.choices?.[0]?.message?.content || '';
    } catch (error: unknown) {
      throw new Error(`OpenAI API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
