import type { ILLMProvider, IMessage } from './ILLMProvider';
import type { ToolRegistry } from '../tools/ToolRegistry';
import type { ProjectIndex } from '../indexer/ProjectIndex';
import type { IToolContextState } from '../tools/ITool';
import type { Logger } from '../utils/Logger';

export class AgenticReviewLoop {
  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly maxTurns = 5,
    private readonly logger?: Logger
  ) {}

  /**
   * Executes a multi-turn agent loop if supported by provider, or falls back to single pass.
   */
  public async runLoop(
    provider: ILLMProvider,
    seedPrompt: string,
    index: ProjectIndex,
    contextState?: IToolContextState
  ): Promise<string> {
    if (!provider.supportsTools || !provider.supportsTools() || !provider.generateToolResponse) {
      this.logger?.info('Provider does not support interactive tools. Executing single-pass review.');
      return provider.generateReview(seedPrompt);
    }

    this.logger?.info('Executing multi-turn tool-calling agent loop...');
    const tools = this.toolRegistry.getToolDefinitions();
    const messages: IMessage[] = [
      {
        role: 'system',
        content:
          'You are a Senior Autonomous Java Architect conducting an enterprise code review.\n' +
          'Always discover project context dynamically via tool calls before generating your final review report.\n' +
          'Recommended Execution Sequence:\n' +
          '1. getReviewScope() & getProjectMetadata()\n' +
          '2. getConfiguredRules()\n' +
          '3. getScorecard() & getStaticFindings()\n' +
          '4. getViolations()\n' +
          '5. readFile(path) / readMethod(class, method) / searchProject(query) for on-demand source analysis\n' +
          '6. Generate final Markdown report with evidence-based recommendations.',
      },
      {
        role: 'user',
        content: seedPrompt,
      },
    ];

    for (let turn = 1; turn <= this.maxTurns; turn++) {
      this.logger?.info(`Agent loop turn ${turn}/${this.maxTurns}...`);
      try {
        const response = await provider.generateToolResponse(messages, tools);

        if (response.type === 'text') {
          this.logger?.info('Agent returned final review text.');
          return response.content;
        }

        if (response.type === 'tool_call') {
          const { toolName, args } = response.toolCall;
          this.logger?.info(`Agent invoked tool '${toolName}' with args: ${JSON.stringify(args)}`);

          const toolResult = await this.toolRegistry.execute(toolName, args, index, contextState);
          messages.push({
            role: 'assistant',
            toolCall: response.toolCall,
          });
          messages.push({
            role: 'tool',
            content: `Tool '${toolName}' result:\n${toolResult}`,
            toolResult,
          });

          if (turn === this.maxTurns - 1) {
            messages.push({
              role: 'system',
              content:
                'FINAL TURN NOTICE: On your next response, stop making tool calls and output your final structured Markdown review report immediately based on the code and findings retrieved so far.',
            });
          }
        }
      } catch (err) {
        this.logger?.warn(`Tool execution turn failed: ${err instanceof Error ? err.message : String(err)}`);
        break;
      }
    }

    // Fallback if max turns reached or loop broke
    this.logger?.warn('Max turns reached or tool loop ended. Generating final response from collected messages.');
    const aggregated = messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content || m.toolResult || ''}`)
      .join('\n\n');
    return provider.generateReview(aggregated);
  }
}
