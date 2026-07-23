import type { IToolDefinition } from '../tools/ITool';

export interface IToolCall {
  readonly id: string;
  readonly toolName: string;
  readonly args: Record<string, any>;
}

export type LLMToolResponse =
  | { readonly type: 'text'; readonly content: string }
  | { readonly type: 'tool_call'; readonly toolCall: IToolCall };

export interface IMessage {
  readonly role: 'system' | 'user' | 'assistant' | 'tool';
  readonly content?: string;
  readonly toolCall?: IToolCall;
  readonly toolResult?: string;
}

/**
 * Extended interface for AI providers supporting single-pass generation and optional multi-turn tool calling.
 */
export interface ILLMProvider {
  /**
   * Generates a review using the specified LLM.
   */
  generateReview(prompt: string): Promise<string>;

  /**
   * Indicates whether this provider supports interactive tool calling.
   */
  supportsTools?(): boolean;

  /**
   * Generates either a tool call request or final text response in a multi-turn agent loop.
   */
  generateToolResponse?(
    messages: IMessage[],
    tools: IToolDefinition[]
  ): Promise<LLMToolResponse>;
}
