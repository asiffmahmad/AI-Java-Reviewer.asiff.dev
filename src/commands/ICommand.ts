/**
 * Base interface for all VS Code commands registered by the extension.
 * Follows the Command pattern.
 */
export interface ICommand {
  /** The unique command identifier (e.g. 'aijavareviewer.runReview') */
  readonly id: string;

  /**
   * Executes the command logic.
   * Any arguments passed from VS Code (e.g. from a context menu) are forwarded.
   */
  execute(...args: unknown[]): Promise<void> | void;
}
