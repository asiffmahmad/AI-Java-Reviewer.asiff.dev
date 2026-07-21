import { BaseHttpProvider } from './BaseHttpProvider';

export class GithubProvider extends BaseHttpProvider {
  private readonly apiKey: string;
  private readonly modelName: string;

  constructor(apiKey: string, modelName: string) {
    super();
    this.apiKey = apiKey;
    this.modelName = modelName || 'gpt-4o';
  }

  public async generateReview(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GitHub API Key (Personal Access Token) is not configured.');
    }

    const payload = JSON.stringify({
      model: this.modelName,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
    });

    const response = await this.post('https://models.inference.ai.azure.com/chat/completions', {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    }, payload);

    try {
      const json = JSON.parse(response);
      if (json.choices && json.choices.length > 0) {
        return json.choices[0].message.content;
      }
      if (json.error) {
        throw new Error(`GitHub API Error: ${json.error.message || JSON.stringify(json.error)}`);
      }
      throw new Error(`Invalid response structure from GitHub: ${response}`);
    } catch (e: any) {
      if (e.message.startsWith('GitHub API Error')) {
        throw e;
      }
      throw new Error(`Failed to parse GitHub response: ${e.message}`);
    }
  }
}
