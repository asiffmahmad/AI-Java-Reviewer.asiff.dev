import * as vscode from 'vscode';

/**
 * High-level orchestrator that coordinates the full review pipeline.
 * Extracted as an interface to decouple the UI commands from the actual pipeline implementation.
 */
export interface IReviewOrchestrator {
  /**
   * Executes a full review run on the current workspace.
   * Throws an error if the workspace is invalid or if the review fails.
   */
  runReview(uri?: vscode.Uri): Promise<void>;
}
