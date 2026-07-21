import * as vscode from 'vscode';
import * as path from 'path';
import type { ICommand } from './ICommand';
import { COMMAND_IDS, DEFAULT_OUTPUT_DIR } from '../utils/constants';

export class ShowReportCommand implements ICommand {
  public readonly id = COMMAND_IDS.SHOW_REPORT;

  public async execute(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace folder open.');
      return;
    }

    // Default path since we don't have the full orchestrator state here easily
    // In a real scenario, this command might take a URI argument or read latest from state.
    const root = workspaceFolders[0].uri.fsPath;
    const reportPath = path.join(root, DEFAULT_OUTPUT_DIR, 'latest-report.md');
    
    try {
      const uri = vscode.Uri.file(reportPath);
      await vscode.commands.executeCommand('markdown.showPreview', uri);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open report: ${reportPath}`);
    }
  }
}
