import * as vscode from 'vscode';
import * as fs from 'fs';
import { ProjectIndex } from './ProjectIndex';
import { JavaAstParser } from '../parser/JavaAstParser';
import { FileUtils } from '../utils/FileUtils';
import { EXCLUDED_DIRECTORIES } from '../utils/constants';
import type { Logger } from '../utils/Logger';

export class WorkspaceIndexer implements vscode.Disposable {
  private readonly parser: JavaAstParser;
  private readonly index: ProjectIndex;
  private fileWatcher?: vscode.FileSystemWatcher;

  constructor(private readonly logger?: Logger) {
    this.parser = new JavaAstParser();
    this.index = new ProjectIndex();
  }

  public getIndex(): ProjectIndex {
    return this.index;
  }

  /**
   * Scans all Java files in the workspace root and builds the ProjectIndex.
   */
  public async indexWorkspace(workspaceRoot: string): Promise<ProjectIndex> {
    this.logger?.info(`Indexing workspace: ${workspaceRoot}`);
    this.index.clear();

    const excludePattern = `**/{${EXCLUDED_DIRECTORIES.join(',')},.gradle,bin,dist,target,out}/**`;
    const javaFiles = await vscode.workspace.findFiles(
      new vscode.RelativePattern(workspaceRoot, '**/*.java'),
      excludePattern
    );

    this.logger?.info(`Indexing ${javaFiles.length} Java source files...`);

    for (const file of javaFiles) {
      await this.indexFile(file.fsPath);
    }

    this.logger?.info(
      `Workspace indexing complete: ${this.index.getMetadata().totalClasses} classes, ${
        this.index.getMetadata().totalSpringBeans
      } Spring beans indexed.`
    );

    this.setupFileWatcher(workspaceRoot);
    return this.index;
  }

  /**
   * Indexes a single Java file by path.
   */
  public async indexFile(filePath: string): Promise<void> {
    try {
      if (!fs.existsSync(filePath)) {
        return;
      }
      const content = await FileUtils.readText(filePath);
      const parsed = this.parser.parse(content, filePath);
      if (parsed) {
        this.index.updateClass(parsed);
      }
    } catch (err) {
      this.logger?.warn(`Failed to index file ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private setupFileWatcher(workspaceRoot: string): void {
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
    }

    if (!vscode.workspace || typeof vscode.workspace.createFileSystemWatcher !== 'function') {
      return;
    }

    const relPattern = new vscode.RelativePattern(workspaceRoot, '**/*.java');
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(relPattern);

    this.fileWatcher.onDidChange(async (uri) => {
      this.logger?.info(`Incremental index update for modified file: ${uri.fsPath}`);
      await this.indexFile(uri.fsPath);
    });

    this.fileWatcher.onDidCreate(async (uri) => {
      this.logger?.info(`Incremental index update for new file: ${uri.fsPath}`);
      await this.indexFile(uri.fsPath);
    });

    this.fileWatcher.onDidDelete((uri) => {
      this.logger?.info(`Incremental index removal for deleted file: ${uri.fsPath}`);
      // Find class by file path and remove
      const all = this.index.getAllClasses();
      const match = all.find((c) => c.filePath === uri.fsPath);
      if (match) {
        this.index.removeClass(match.fullyQualifiedName || match.className);
      }
    });
  }

  public dispose(): void {
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
    }
  }
}
