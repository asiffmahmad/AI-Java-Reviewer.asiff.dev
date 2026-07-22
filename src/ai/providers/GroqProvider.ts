import { BaseHttpProvider } from './BaseHttpProvider';

export class GroqProvider extends BaseHttpProvider {
  private readonly apiKey: string;
  private readonly modelName: string;

  constructor(apiKey: string, modelName: string) {
    super();
    this.apiKey = apiKey;
    // Default to llama-3.3-70b-versatile if none provided or if it's the old gpt-4o default
    this.modelName = (!modelName || modelName === 'gpt-4o') ? 'llama-3.3-70b-versatile' : modelName;
  }

  public async generateReview(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Groq API Key is not configured.');
    }

    const payload = JSON.stringify({
      model: this.modelName,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.0,
    });

    const response = await this.post('https://api.groq.com/openai/v1/chat/completions', {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    }, payload);

    try {
      const json = JSON.parse(response);
      if (json.choices && json.choices.length > 0) {
        return json.choices[0].message.content;
      }
      if (json.error) {
        throw new Error(`Groq API Error: ${json.error.message || JSON.stringify(json.error)}`);
      }
      throw new Error(`Invalid response structure from Groq: ${response}`);
    } catch (e: any) {
      if (e.message.startsWith('Groq API Error')) {
        throw e;
      }
      throw new Error(`Failed to parse Groq response: ${e.message}`);
    }
  }
}
