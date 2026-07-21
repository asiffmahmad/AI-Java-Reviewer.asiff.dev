import * as vscode from 'vscode';
import { Logger } from './utils/Logger';
import { EXTENSION_NAME } from './utils/constants';
import { SecretManager } from './configuration/SecretManager';
import { CommandRegistry } from './commands/CommandRegistry';
import { ConfigureProviderCommand } from './commands/ConfigureProviderCommand';
import { RunReviewCommand } from './commands/RunReviewCommand';
import { ShowReportCommand } from './commands/ShowReportCommand';


import { ReviewOrchestrator } from './orchestrator/ReviewOrchestrator';

let commandRegistry: CommandRegistry | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // 1. Initialize Logger
  const outputChannel = vscode.window.createOutputChannel(EXTENSION_NAME);
  context.subscriptions.push(outputChannel);
  const logger = Logger.initialize(outputChannel);
  logger.info(`${EXTENSION_NAME} is now active.`);

  // 2. Initialize Core Infrastructure
  const secretManager = new SecretManager(context.secrets);
  
  // 3. Initialize Orchestrator
  const orchestrator = new ReviewOrchestrator(logger, secretManager);

  // 4. Register Commands
  commandRegistry = new CommandRegistry();
  commandRegistry.registerAll(
    [
      new ConfigureProviderCommand(secretManager),
      new RunReviewCommand(orchestrator),
      new ShowReportCommand(),
    ],
    context
  );

  logger.info('Commands registered successfully.');
}

export function deactivate(): void {
  if (commandRegistry) {
    commandRegistry.dispose();
  }
  try {
    Logger.getInstance().dispose();
  } catch (e) {
    // Ignore if not initialized
  }
}
