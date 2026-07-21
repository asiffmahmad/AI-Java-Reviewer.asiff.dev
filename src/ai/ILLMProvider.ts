/**
 * Interface for AI providers (Claude, GPT, Gemini, etc.)
 */
export interface ILLMProvider {
  /**
   * Generates a review using the specified LLM.
   *
   * @param prompt The prompt context containing code, findings, and instructions.
   * @returns The generated review as a markdown string.
   */
  generateReview(prompt: string): Promise<string>;
}
