import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import type { IReviewOrchestrator } from '../commands/IReviewOrchestrator';
import type { Logger } from '../utils/Logger';
import type { SecretManager } from '../configuration/SecretManager';
import { ConfigurationLoader } from '../configuration/ConfigurationLoader';
import { JavaAstParser } from '../parser/JavaAstParser';
import { DependencyParser } from '../parser/DependencyParser';
import { RuleEngine } from '../rules/RuleEngine';
import { ScoreCalculator } from '../scoring/ScoreCalculator';
import { ReviewAgent } from '../ai/ReviewAgent';
import { FileUtils } from '../utils/FileUtils';
import { EXCLUDED_DIRECTORIES } from '../utils/constants';
import { WorkspaceIndexer } from '../indexer/WorkspaceIndexer';
import type { IJavaClass } from '../models';

// Import implemented static analysis rules
import { FieldInjectionRule } from '../rules/FieldInjectionRule';
import { MissingTransactionalRule } from '../rules/MissingTransactionalRule';
import { RepositoryInControllerRule } from '../rules/RepositoryInControllerRule';
import { SystemOutPrintlnRule } from '../rules/SystemOutPrintlnRule';
import { HardcodedSecretRule } from '../rules/HardcodedSecretRule';
import { NPlusOneQueryRule } from '../rules/NPlusOneQueryRule';
import { MissingValidationRule } from '../rules/MissingValidationRule';
import { FindAllWithoutPaginationRule } from '../rules/FindAllWithoutPaginationRule';

export class ReviewOrchestrator implements IReviewOrchestrator {
  private workspaceIndexer?: WorkspaceIndexer;

  constructor(
    private readonly logger: Logger,
    private readonly secretManager: SecretManager
  ) {}

  public async runReview(uri?: vscode.Uri): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('No active workspace folder found.');
    }

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

    // 3. Initialize or retrieve Workspace Project Indexer
    if (!this.workspaceIndexer) {
      this.workspaceIndexer = new WorkspaceIndexer(this.logger);
    }
    const index = await this.workspaceIndexer.indexWorkspace(workspaceRoot);

    // 4. Determine Target Review File(s) across single files, directories (with subfolders), or full workspace
    const parser = new JavaAstParser();
    const excludePattern = `**/{${EXCLUDED_DIRECTORIES.join(',')},.gradle,bin,dist,target,out}/**`;
    let targetClasses: IJavaClass[] = [];

    if (uri && fs.existsSync(uri.fsPath)) {
      const stat = fs.statSync(uri.fsPath);
      if (stat.isFile() && uri.fsPath.endsWith('.java')) {
        this.logger.info(`Single file review requested: ${uri.fsPath}`);
        const content = await FileUtils.readText(uri.fsPath);
        const parsed = parser.parse(content, uri.fsPath);
        if (parsed) {
          targetClasses = [parsed];
        }
      } else if (stat.isDirectory()) {
        this.logger.info(`Directory review requested for folder and subfolders: ${uri.fsPath}`);
        const dirPath = uri.fsPath;
        targetClasses = index.getAllClasses().filter((c) => {
          const rel = path.relative(dirPath, c.filePath);
          return !rel.startsWith('..') && !path.isAbsolute(rel);
        });
      }
    }

    // If no URI target or no target classes found from URI, default to all workspace classes across all subfolders
    if (targetClasses.length === 0) {
      targetClasses = index.getAllClasses();
    }

    // Fallback if index has no classes (e.g. mock unit test environment)
    if (targetClasses.length === 0) {
      const javaFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceRoot, '**/*.java'), excludePattern);
      for (const file of javaFiles) {
        try {
          const content = await FileUtils.readText(file.fsPath);
          const parsed = parser.parse(content, file.fsPath);
          if (parsed) {
            targetClasses.push(parsed);
          }
        } catch {
          // Ignore unreadable mock files
        }
      }
    }

    if (targetClasses.length === 0) {
      throw new Error('No Java files found in the workspace to review.');
    }

    this.logger.info(`Target scope contains ${targetClasses.length} Java file(s) across subfolders.`);

    // 5. Parse Build Dependencies
    const pomFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceRoot, '**/pom.xml'), excludePattern);
    const gradleFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceRoot, '**/*.gradle'), excludePattern);

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
    ruleEngine.registerRules([
      new FieldInjectionRule(),
      new MissingTransactionalRule(),
      new RepositoryInControllerRule(),
      new SystemOutPrintlnRule(),
      new HardcodedSecretRule(),
      new NPlusOneQueryRule(),
      new MissingValidationRule(),
      new FindAllWithoutPaginationRule(),
    ]);

    // 7. Setup Agent
    const scoreCalculator = new ScoreCalculator();
    const agent = new ReviewAgent(ruleEngine, scoreCalculator, this.logger);

    // 8. Execute AI Review with Context Builder & On-Demand Retrieval
    this.logger.info('Executing AI review with Context Builder & On-Demand Tool Retrieval...');
    const timestamp = Date.now();
    const promptFileName = `prompt-${timestamp}.md`;
    const outDir = path.join(workspaceRoot, config.outputDir || '.review-ai/reports');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const outFilePath = path.join(outDir, `review-${timestamp}.md`);
    const promptFilePath = path.join(outDir, promptFileName);

    const { reportMarkdown, promptText } = await agent.executeReview(
      targetClasses,
      dependencies,
      config,
      apiKey,
      promptFileName,
      index,
      workspaceRoot
    );

    // 9. Save Both Outputs
    await FileUtils.writeText(promptFilePath, promptText);
    await FileUtils.writeText(outFilePath, reportMarkdown);
    this.logger.info(`Review report saved to ${outFilePath}`);
    this.logger.info(`Prompt artifact saved to ${promptFilePath}`);

    // 10. Open Review Report in VS Code
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(outFilePath));
    await vscode.window.showTextDocument(doc);

    // Explicitly notify the user with the absolute paths
    vscode.window.showInformationMessage(`AI Review complete! Saved report: ${outFilePath} | Saved prompt: ${promptFilePath}`);
  }
}
