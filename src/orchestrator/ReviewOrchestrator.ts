import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import type { IReviewOrchestrator } from '../commands/IReviewOrchestrator';
import type { Logger } from '../utils/Logger';
import type { SecretManager } from '../configuration/SecretManager';
import { ConfigurationLoader } from '../configuration/ConfigurationLoader';
import { RegexJavaParser } from '../parser/RegexJavaParser';
import { DependencyParser } from '../parser/DependencyParser';
import { RuleEngine } from '../rules/RuleEngine';
import { ScoreCalculator } from '../scoring/ScoreCalculator';
import { ReviewAgent } from '../ai/ReviewAgent';
import { FileUtils } from '../utils/FileUtils';

// Import our implemented rules
import { FieldInjectionRule } from '../rules/FieldInjectionRule';

export class ReviewOrchestrator implements IReviewOrchestrator {
  constructor(
    private readonly logger: Logger,
    private readonly secretManager: SecretManager
  ) {}

  public async runReview(uri?: vscode.Uri): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('No active workspace folder found.');
    }
    
    // Determine the root for the review.
    // If a URI was provided (e.g. from context menu), we use its workspace.
    // Otherwise, we use the first workspace folder.
    let workspaceRoot = workspaceFolders[0].uri.fsPath;
    if (uri) {
      const folder = vscode.workspace.getWorkspaceFolder(uri);
      if (folder) {
        workspaceRoot = folder.uri.fsPath;
      }
    }

    this.logger.info(`Starting review for workspace: ${workspaceRoot}`);

    // 1. Load Configuration
    const configLoader = new ConfigurationLoader(this.logger);
    const config = await configLoader.load(workspaceRoot);

    // 2. Load API Key
    let apiKey = '';
    if (config.provider !== 'ollama') { // ollama doesn't require an api key generally
      const key = await this.secretManager.getKey(config.provider);
      if (!key) {
        throw new Error(`API Key for ${config.provider} is not configured. Please run "AI Java Reviewer: Configure AI Provider".`);
      }
      apiKey = key;
    }

    // 3. Scan Workspace
    // Note: We use relative path for workspace.findFiles
    const javaFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceRoot, '**/*.java'), '**/node_modules/**');
    const pomFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceRoot, '**/pom.xml'), '**/node_modules/**');
    const gradleFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceRoot, '**/*.gradle'), '**/node_modules/**');

    if (javaFiles.length === 0) {
      throw new Error('No Java files found in the workspace.');
    }

    this.logger.info(`Found ${javaFiles.length} Java files.`);

    // 4. Parse Java Files
    const parser = new RegexJavaParser();
    const classes = [];
    for (const file of javaFiles) {
      const content = await FileUtils.readText(file.fsPath);
      const javaClass = parser.parse(content, file.fsPath);
      if (javaClass) {
        classes.push(javaClass);
      }
    }

    // 5. Parse Dependencies
    const depParser = new DependencyParser();
    const dependencies: string[] = [];
    for (const file of pomFiles) {
      const content = await FileUtils.readText(file.fsPath);
      dependencies.push(...depParser.parsePom(content));
    }
    for (const file of gradleFiles) {
      const content = await FileUtils.readText(file.fsPath);
      dependencies.push(...depParser.parseGradle(content));
    }

    // 6. Setup Rule Engine
    const ruleEngine = new RuleEngine();
    // Register the rules we have implemented so far
    ruleEngine.registerRule(new FieldInjectionRule());

    // 7. Setup Agent
    const scoreCalculator = new ScoreCalculator();
    const agent = new ReviewAgent(ruleEngine, scoreCalculator);

    // 8. Execute AI Review
    this.logger.info('Executing AI review...');
    const reviewMarkdown = await agent.executeReview(classes, dependencies, config, apiKey);

    // 9. Save Output
    // Save to current workspace root + configured outputDir
    const outDir = path.join(workspaceRoot, config.outputDir || '.review-ai/reports');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const timestamp = Date.now();
    const outFilePath = path.join(outDir, `review-${timestamp}.md`);
    
    await FileUtils.writeText(outFilePath, reviewMarkdown);
    this.logger.info(`Review saved to ${outFilePath}`);

    // 10. Open in VS Code
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(outFilePath));
    await vscode.window.showTextDocument(doc);
    
    // Explicitly notify the user with the absolute path
    vscode.window.showInformationMessage(`AI Review complete! Saved to: ${outFilePath}`);
  }
}
