import * as vscode from 'vscode';
import type { ICommand } from './ICommand';

/**
 * Central registry for registering VS Code commands.
 */
export class CommandRegistry {
  private readonly disposables: vscode.Disposable[] = [];

  /**
   * Registers a list of commands with VS Code.
   */
  public registerAll(commands: ICommand[], context: vscode.ExtensionContext): void {
    for (const command of commands) {
      const disposable = vscode.commands.registerCommand(
        command.id,
        async (...args) => {
          try {
            await command.execute(...args);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Command failed: ${message}`);
          }
        }
      );
      this.disposables.push(disposable);
      context.subscriptions.push(disposable);
    }
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }
}
