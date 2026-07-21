import type { ILLMProvider } from '../ILLMProvider';
import { BaseHttpProvider } from './BaseHttpProvider';
import { DEFAULT_OLLAMA_BASE_URL } from '../../utils/constants';

export class OllamaProvider extends BaseHttpProvider implements ILLMProvider {
  private model: string;
  private endpoint: string;

  constructor(model: string, baseUrl?: string) {
    super();
    this.model = model;
    const base = (baseUrl || DEFAULT_OLLAMA_BASE_URL).replace(/\/$/, '');
    this.endpoint = `${base}/api/generate`;
  }

  public async generateReview(prompt: string): Promise<string> {
    const payload = {
      model: this.model,
      prompt: prompt,
      stream: false
    };

    const headers = {
      'Content-Type': 'application/json',
    };

    try {
      const response = await this.post(this.endpoint, headers, JSON.stringify(payload));
      const json = JSON.parse(response);
      return json.response || '';
    } catch (error: unknown) {
      throw new Error(`Ollama API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
