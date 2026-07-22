import type { ILLMProvider } from '../ILLMProvider';
import { BaseHttpProvider } from './BaseHttpProvider';
import { DEFAULT_OPENROUTER_BASE_URL } from '../../utils/constants';

export class OpenRouterProvider extends BaseHttpProvider implements ILLMProvider {
  private apiKey: string;
  private model: string;
  private endpoint: string;

  constructor(apiKey: string, model: string, baseUrl?: string) {
    super();
    this.apiKey = apiKey;
    this.model = model;
    const base = (baseUrl || DEFAULT_OPENROUTER_BASE_URL).replace(/\/$/, '');
    this.endpoint = `${base}/api/v1/chat/completions`;
  }

  public async generateReview(prompt: string): Promise<string> {
    const payload = {
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.0,
    };

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'HTTP-Referer': 'https://github.com/asiffmahmad/AI-Java-Reviewer.asiff.dev', 
      'X-Title': 'AI Java Reviewer'
    };

    try {
      const response = await this.post(this.endpoint, headers, JSON.stringify(payload));
      const json = JSON.parse(response);
      return json.choices?.[0]?.message?.content || '';
    } catch (error: unknown) {
      throw new Error(`OpenRouter API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
