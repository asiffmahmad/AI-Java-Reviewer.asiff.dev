/**
 * Raw response received from an AI provider after sending a structured prompt.
 */
export interface IAIResponse {
  /** The textual content returned by the model */
  readonly content: string;
  /** Total tokens consumed (input + output), if reported by the provider */
  readonly tokensUsed?: number;
  /** Exact model identifier used, as reported by the provider */
  readonly model: string;
  /** Provider name, e.g. "openai" */
  readonly provider: string;
  /** Round-trip duration in milliseconds */
  readonly durationMs: number;
}
