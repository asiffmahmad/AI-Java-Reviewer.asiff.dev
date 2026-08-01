import * as vscode from 'vscode';
import type { ICommand } from './ICommand';
import type { ReviewOrchestrator } from '../orchestrator/ReviewOrchestrator';

export class RunMrReviewCommand implements ICommand {
  public readonly id = 'aijavareviewer.runMrReview';

  constructor(private readonly orchestrator: ReviewOrchestrator) {}

  public async execute(uri?: vscode.Uri): Promise<void> {
    const input = await vscode.window.showInputBox({
      title: 'AI MR / PR Code Review',
      prompt: 'Enter Merge Request (MR) / Pull Request (PR) Git URL, local branch ref (e.g. origin/main...HEAD), or diff input:',
      placeHolder: 'https://gitlab.example.com/owner/repo/-/merge_requests/24 or origin/main',
      ignoreFocusOut: true,
    });

    if (!input || input.trim().length === 0) {
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Running AI MR/PR Code Review...',
        cancellable: false,
      },
      async (progress) => {
        progress.report({ message: 'Resolving MR diff & scope...' });
        await this.orchestrator.runMrReview(input.trim(), uri);
      }
    );
  }
}
