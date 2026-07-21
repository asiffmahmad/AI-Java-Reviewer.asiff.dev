import * as vscode from 'vscode';
import type { ICommand } from './ICommand';
import type { IReviewOrchestrator } from './IReviewOrchestrator';
import { COMMAND_IDS } from '../utils/constants';

export class RunReviewCommand implements ICommand {
  public readonly id = COMMAND_IDS.RUN_REVIEW;

  constructor(private readonly orchestrator: IReviewOrchestrator) {}

  public async execute(uri?: vscode.Uri): Promise<void> {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'AI Java Review',
        cancellable: false,
      },
      async (progress) => {
        try {
          progress.report({ message: 'Starting analysis...' });
          await this.orchestrator.runReview(uri);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`Review failed: ${message}`);
        }
      }
    );
  }
}
