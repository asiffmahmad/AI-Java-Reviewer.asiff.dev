import type { ProjectIndex } from '../indexer/ProjectIndex';
import type { IFinding, IProjectScore } from '../models';
import type { ReviewContextState } from '../context/ReviewContextState';

export type IToolContextState = ReviewContextState | {
  readonly findings?: IFinding[];
  readonly score?: IProjectScore;
  readonly dependencies?: string[];
};

export interface IToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: {
    readonly type: 'object';
    readonly properties: Record<string, {
      readonly type: string;
      readonly description: string;
      readonly enum?: string[];
    }>;
    readonly required?: string[];
  };
}

export interface ITool {
  readonly definition: IToolDefinition;
  execute(args: Record<string, any>, index: ProjectIndex, contextState?: ReviewContextState | IToolContextState): Promise<string>;
}
