import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
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
    const reportsDir = path.join(root, DEFAULT_OUTPUT_DIR);
    
    try {
      if (fs.existsSync(reportsDir)) {
        const files = fs.readdirSync(reportsDir)
          .filter(f => f.startsWith('review-') && f.endsWith('.md'))
          .sort((a, b) => fs.statSync(path.join(reportsDir, b)).mtimeMs - fs.statSync(path.join(reportsDir, a)).mtimeMs);
        
        if (files.length > 0) {
          const latestPath = path.join(reportsDir, files[0]);
          const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(latestPath));
          await vscode.window.showTextDocument(doc);
          return;
        }
      }
      vscode.window.showInformationMessage('No review reports found. Run "AI Java Reviewer: Run AI Review" first.');
    } catch {
      vscode.window.showErrorMessage('Failed to locate review reports directory.');
    }
  }
}
