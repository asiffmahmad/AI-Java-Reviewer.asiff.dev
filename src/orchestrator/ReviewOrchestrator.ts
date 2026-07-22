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
import { EXCLUDED_DIRECTORIES } from '../utils/constants';

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
    if (config.provider !== 'ollama' && config.provider !== 'vscode-lm') {
      const key = await this.secretManager.getKey(config.provider);
      if (key) {
        apiKey = key;
      }
    }

    // 3. Scan Workspace or Target File
    const excludePattern = `**/{${EXCLUDED_DIRECTORIES.join(',')},.gradle,bin,dist}/**`;
    let javaFiles: vscode.Uri[] = [];

    if (uri && uri.fsPath.endsWith('.java') && fs.existsSync(uri.fsPath) && fs.statSync(uri.fsPath).isFile()) {
      this.logger.info(`Single file review requested: ${uri.fsPath}`);
      javaFiles = [uri];
    } else {
      javaFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceRoot, '**/*.java'), excludePattern);
    }

    const pomFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceRoot, '**/pom.xml'), excludePattern);
    const gradleFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceRoot, '**/*.gradle'), excludePattern);

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
    const timestamp = Date.now();
    const promptFileName = `prompt-${timestamp}.md`;
    const outDir = path.join(workspaceRoot, config.outputDir || '.review-ai/reports');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const outFilePath = path.join(outDir, `review-${timestamp}.md`);
    const promptFilePath = path.join(outDir, promptFileName);

    const { reportMarkdown, promptText } = await agent.executeReview(classes, dependencies, config, apiKey, promptFileName);

    // Format full prompt file artifact with usage instructions header
    const fullPromptContent =
      `# 📝 AI Java Reviewer — Copy-Paste Web Prompt Artifact\n\n` +
      `> **Instructions**: Copy the entire text below and paste it into **Antigravity Chat**, **Google Gemini**, **ChatGPT**, or **Claude Web**.\n\n` +
      `---\n\n` +
      promptText;

    // 9. Save Both Outputs
    await FileUtils.writeText(promptFilePath, fullPromptContent);
    await FileUtils.writeText(outFilePath, reportMarkdown);
    this.logger.info(`Review report saved to ${outFilePath}`);
    this.logger.info(`Full prompt artifact saved to ${promptFilePath}`);

    // 10. Open Review Report in VS Code
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(outFilePath));
    await vscode.window.showTextDocument(doc);
    
    // Explicitly notify the user with the absolute paths
    vscode.window.showInformationMessage(`AI Review complete! Saved report: ${outFilePath} | Saved prompt: ${promptFilePath}`);
  }
}
