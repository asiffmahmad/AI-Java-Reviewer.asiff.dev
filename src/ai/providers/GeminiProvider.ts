import type { ILLMProvider } from '../ILLMProvider';
import { BaseHttpProvider } from './BaseHttpProvider';

export class GeminiProvider extends BaseHttpProvider implements ILLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    super();
    this.apiKey = apiKey;
    this.model = model;
  }

  public async generateReview(prompt: string): Promise<string> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.0
      }
    };

    const headers = {
      'Content-Type': 'application/json',
    };

    try {
      const response = await this.post(endpoint, headers, JSON.stringify(payload));
      const json = JSON.parse(response);
      return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (error: unknown) {
      throw new Error(`Gemini API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
