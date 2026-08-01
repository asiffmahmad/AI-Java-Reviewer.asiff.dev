import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import type { Logger } from '../utils/Logger';

export interface IImpactedFile {
  readonly filePath: string;
  readonly status: 'NEW' | 'MODIFIED' | 'DELETED' | 'RENAMED';
  readonly lineRanges: string[]; // e.g. ["5-10", "25-30"]
  readonly diffHunks?: string;
  readonly fullContent?: string;
}

export interface IMrDetails {
  readonly mrUrl: string;
  readonly title?: string;
  readonly projectPath?: string;
  readonly isCatalogServices: boolean;
  readonly impactedFiles: IImpactedFile[];
  readonly rawDiff: string;
}

export class GitMrService {
  constructor(private readonly logger?: Logger) {}

  /**
   * Fetches and parses MR/PR diff from a URL or local git diff.
   */
  public async resolveMrDetails(mrUrlOrBranch: string, workspaceRoot: string, targetSubpath?: string): Promise<IMrDetails> {
    this.logger?.info(`Resolving MR/PR details for input: ${mrUrlOrBranch}${targetSubpath ? ` (subpath: ${targetSubpath})` : ''}`);

    const trimmedInput = mrUrlOrBranch.trim();
    let rawDiff = '';
    let isCatalogServices = false;

    // Check if repository is catalogservices
    if (workspaceRoot.toLowerCase().includes('catalogservices') || trimmedInput.toLowerCase().includes('catalogservices')) {
      isCatalogServices = true;
    }

    if (this.isUrl(trimmedInput)) {
      rawDiff = await this.fetchDiffFromUrl(trimmedInput, workspaceRoot);
    } else if (trimmedInput.startsWith('diff:')) {
      rawDiff = trimmedInput.substring(5).trim();
    } else {
      // Treat as local git branch/ref comparison (e.g. "origin/main", "HEAD~1", "main...HEAD")
      rawDiff = await this.fetchLocalGitDiff(trimmedInput, workspaceRoot, targetSubpath);
    }

    if (!rawDiff || rawDiff.trim().length === 0) {
      // Try uncommitted/working tree changes diff if remote comparison returned empty
      rawDiff = await this.fetchWorkingTreeDiff(workspaceRoot, targetSubpath);
    }

    if (!rawDiff || rawDiff.trim().length === 0) {
      throw new Error(`Could not obtain Git diff for '${targetSubpath || mrUrlOrBranch}'. Please verify git status or branch remote access.`);
    }

    const impactedFiles = this.parseUnifiedDiff(rawDiff);

    return {
      mrUrl: mrUrlOrBranch,
      isCatalogServices,
      impactedFiles,
      rawDiff,
    };
  }

  private isUrl(input: string): boolean {
    return /^https?:\/\//i.test(input);
  }

  /**
   * Fetches unified diff from GitLab or GitHub API using URL with local git fallback.
   */
  private async fetchDiffFromUrl(urlStr: string, workspaceRoot?: string): Promise<string> {
    const parsedUrl = new URL(urlStr);
    let gitlabToken = vscode.workspace.getConfiguration('aijavareviewer').get<string>('gitlabToken') || '';
    let githubToken = vscode.workspace.getConfiguration('aijavareviewer').get<string>('githubToken') || '';

    // Check for GitLab MR URL pattern (e.g. https://gitlab.com/owner/repo/-/merge_requests/24)
    const gitlabMatch = parsedUrl.pathname.match(/\/(.+?)\/-\/merge_requests\/(\d+)/);
    const githubMatch = parsedUrl.pathname.match(/\/(.+?)\/(.+?)\/pull\/(\d+)/);

    // 1. Try Direct Web .diff and .patch URL fetch (e.g. https://github.com/owner/repo/pull/2.diff)
    for (const ext of ['.diff', '.patch']) {
      try {
        const patchUrl = urlStr.endsWith('.patch') || urlStr.endsWith('.diff') ? urlStr : `${urlStr}${ext}`;
        const headers: Record<string, string> = { 'User-Agent': 'AI-Java-Reviewer-VSCode' };
        if (gitlabToken) headers['PRIVATE-TOKEN'] = gitlabToken;
        if (githubToken) headers['Authorization'] = `token ${githubToken}`;

        const resText = await this.httpGet(patchUrl, headers);
        if (resText && !resText.includes('<!DOCTYPE html>') && (resText.includes('diff --git') || resText.includes('--- a/') || resText.includes('@@'))) {
          return resText;
        }
      } catch {
        // Continue
      }
    }

    // 2. Try API Endpoint fetch
    if (gitlabMatch) {
      const projectPathEncoded = encodeURIComponent(gitlabMatch[1]);
      const mrIid = gitlabMatch[2];
      try {
        const apiUrl = `${parsedUrl.protocol}//${parsedUrl.host}/api/v4/projects/${projectPathEncoded}/merge_requests/${mrIid}.diff`;
        const headers: Record<string, string> = { 'User-Agent': 'AI-Java-Reviewer-VSCode' };
        if (gitlabToken) headers['PRIVATE-TOKEN'] = gitlabToken;
        const res = await this.httpGet(apiUrl, headers);
        if (res && (res.includes('diff --git') || res.includes('--- a/') || res.includes('@@'))) {
          return res;
        }
      } catch {
        // Continue to local git fallback
      }
    }

    if (githubMatch) {
      const owner = githubMatch[1];
      const repo = githubMatch[2];
      const prNumber = githubMatch[3];
      try {
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
        const headers: Record<string, string> = {
          'Accept': 'application/vnd.github.v3.diff',
          'User-Agent': 'AI-Java-Reviewer-VSCode'
        };
        if (githubToken) {
          headers['Authorization'] = `token ${githubToken}`;
        }
        const res = await this.httpGet(apiUrl, headers);
        if (res && (res.includes('diff --git') || res.includes('--- a/') || res.includes('@@'))) {
          return res;
        }
      } catch {
        // Continue to local git fallback
      }
    }

    // 3. Fallback: Local `git fetch` command using user's terminal SSH / git credentials
    if (workspaceRoot) {
      try {
        if (gitlabMatch) {
          const mrIid = gitlabMatch[2];
          this.logger?.info(`Attempting local git fetch for GitLab MR !${mrIid}...`);
          const gitDiff = await this.execGitCmd(`git fetch origin merge-requests/${mrIid}/head:mr-${mrIid} && git diff HEAD...mr-${mrIid}`, workspaceRoot);
          if (gitDiff && gitDiff.trim().length > 0) return gitDiff;
        } else if (githubMatch) {
          const prIid = githubMatch[3];
          this.logger?.info(`Attempting local git fetch for GitHub PR #${prIid}...`);
          const gitDiff = await this.execGitCmd(`git fetch origin pull/${prIid}/head:pr-${prIid} && git diff HEAD...pr-${prIid}`, workspaceRoot);
          if (gitDiff && gitDiff.trim().length > 0) return gitDiff;
        }

        // Generic local git diff fallback
        const localDiff = await this.fetchLocalGitDiff('origin/main...HEAD', workspaceRoot);
        if (localDiff && localDiff.trim().length > 0) return localDiff;
      } catch {
        // Continue to interactive token prompt
      }
    }

    // 4. Interactive Token Prompt if no token is configured and git fetch failed
    const isGitLab = !!gitlabMatch || urlStr.includes('gitlab');
    const tokenSettingKey = isGitLab ? 'gitlabToken' : 'githubToken';

    const inputToken = await vscode.window.showInputBox({
      title: `${isGitLab ? 'GitLab' : 'GitHub'} Access Token Required`,
      prompt: `Enter your ${isGitLab ? 'GitLab Personal Access Token' : 'GitHub Personal Access Token'} to access private MR '${urlStr}':`,
      password: true,
      ignoreFocusOut: true,
    });

    if (inputToken && inputToken.trim().length > 0) {
      const cleanToken = inputToken.trim();
      try {
        await vscode.workspace.getConfiguration('aijavareviewer').update(tokenSettingKey, cleanToken, vscode.ConfigurationTarget.Global);
      } catch {
        try {
          await vscode.workspace.getConfiguration('aijavareviewer').update(tokenSettingKey, cleanToken, vscode.ConfigurationTarget.Workspace);
        } catch {
          // Ignore configuration update errors; cleanToken will still be used in memory for this request
        }
      }

      if (isGitLab && gitlabMatch) {
        const projectPathEncoded = encodeURIComponent(gitlabMatch[1]);
        const mrIid = gitlabMatch[2];
        const apiUrl = `${parsedUrl.protocol}//${parsedUrl.host}/api/v4/projects/${projectPathEncoded}/merge_requests/${mrIid}.diff`;
        return this.httpGet(apiUrl, { 'PRIVATE-TOKEN': cleanToken });
      } else if (!isGitLab && githubMatch) {
        const owner = githubMatch[1];
        const repo = githubMatch[2];
        const prNumber = githubMatch[3];
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
        return this.httpGet(apiUrl, {
          'Accept': 'application/vnd.github.v3.diff',
          'User-Agent': 'AI-Java-Reviewer-VSCode',
          'Authorization': `token ${cleanToken}`
        });
      }
    }

    throw new Error(`Could not fetch MR diff from '${urlStr}'. Please configure '${tokenSettingKey}' in VS Code Settings or ensure local git remote access.`);
  }

  private execGitCmd(cmd: string, cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      child_process.exec(cmd, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
        if (err) return reject(err);
        resolve(stdout);
      });
    });
  }

  /**
   * Runs local `git diff` command with optional subpath filtering.
   */
  private fetchLocalGitDiff(targetRef: string, cwd: string, targetSubpath?: string): Promise<string> {
    return new Promise((resolve) => {
      const pathFilter = targetSubpath ? ` -- "${targetSubpath}"` : '';
      const cmd = `git diff ${targetRef.includes('..') ? targetRef : `${targetRef}...HEAD`}${pathFilter}`;
      child_process.exec(cmd, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
        if (err || !stdout || stdout.trim().length === 0) {
          // Fallback to git diff HEAD~1
          child_process.exec(`git diff HEAD~1${pathFilter}`, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err2, stdout2) => {
            if (err2 || !stdout2) return resolve('');
            resolve(stdout2);
          });
        } else {
          resolve(stdout);
        }
      });
    });
  }

  /**
   * Fetches uncommitted, staged, or untracked file diffs in working tree.
   */
  private fetchWorkingTreeDiff(cwd: string, targetSubpath?: string): Promise<string> {
    return new Promise((resolve) => {
      const pathFilter = targetSubpath ? ` -- "${targetSubpath}"` : '';
      // Try unstaged + staged diff
      child_process.exec(`git diff HEAD${pathFilter}`, { cwd, maxBuffer: 10 * 1024 * 1024 }, (_err, stdout) => {
        if (stdout && stdout.trim().length > 0) return resolve(stdout);

        // Try git diff (staged)
        child_process.exec(`git diff --staged${pathFilter}`, { cwd, maxBuffer: 10 * 1024 * 1024 }, (_err2, stdout2) => {
          if (stdout2 && stdout2.trim().length > 0) return resolve(stdout2);

          // Find untracked files
          child_process.exec(`git status --porcelain${pathFilter}`, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err3, stdout3) => {
            if (err3 || !stdout3 || stdout3.trim().length === 0) return resolve('');
            
            // Build synthetic diff for untracked/modified files
            const lines = stdout3.split('\n').map(l => l.trim()).filter(Boolean);
            let synthDiff = '';
            for (const l of lines) {
              const relPath = l.substring(3).trim();
              if (relPath && (relPath.endsWith('.java') || targetSubpath)) {
                synthDiff += `diff --git a/${relPath} b/${relPath}\nnew file mode 100644\n--- /dev/null\n+++ b/${relPath}\n@@ -0,0 +1,1000 @@\n`;
              }
            }
            resolve(synthDiff);
          });
        });
      });
    });
  }

  /**
   * Parses unified diff text into structured IImpactedFile objects with line ranges.
   */
  public parseUnifiedDiff(diffText: string): IImpactedFile[] {
    const files: IImpactedFile[] = [];
    const fileBlocks = diffText.split(/^diff --git /m).filter(Boolean);

    for (const block of fileBlocks) {
      const lines = block.split('\n');
      let oldPath = '';
      let newPath = '';
      let isNew = false;
      let isDeleted = false;

      for (const line of lines) {
        if (line.startsWith('--- a/')) {
          oldPath = line.substring(6).trim();
        } else if (line.startsWith('--- /dev/null')) {
          isNew = true;
        } else if (line.startsWith('+++ b/')) {
          newPath = line.substring(6).trim();
        } else if (line.startsWith('+++ /dev/null')) {
          isDeleted = true;
        }
      }

      const targetPath = newPath || oldPath;
      if (!targetPath) continue;

      let status: 'NEW' | 'MODIFIED' | 'DELETED' | 'RENAMED' = 'MODIFIED';
      if (isNew) status = 'NEW';
      else if (isDeleted) status = 'DELETED';
      else if (oldPath && newPath && oldPath !== newPath) status = 'RENAMED';

      const lineRanges: string[] = [];
      // Parse hunk headers: @@ -oldStart,oldLen +newStart,newLen @@
      const hunkHeaderRegex = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm;
      let match: RegExpExecArray | null;

      while ((match = hunkHeaderRegex.exec(block)) !== null) {
        const startLine = parseInt(match[1], 10);
        const lineCount = match[2] !== undefined ? parseInt(match[2], 10) : 1;
        if (lineCount > 0) {
          const endLine = startLine + lineCount - 1;
          lineRanges.push(startLine === endLine ? `${startLine}` : `${startLine}-${endLine}`);
        }
      }

      files.push({
        filePath: targetPath,
        status,
        lineRanges,
        diffHunks: block,
      });
    }

    return files;
  }

  private httpGet(urlStr: string, headers: Record<string, string>): Promise<string> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(urlStr);
      const protocol = parsed.protocol === 'https:' ? https : http;

      const req = protocol.get(urlStr, { headers }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // Redirect
          return resolve(this.httpGet(res.headers.location, headers));
        }

        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          return reject(new Error(`HTTP GET ${urlStr} failed with status code ${res.statusCode}`));
        }

        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve(body));
      });

      req.on('error', (err) => reject(err));
    });
  }
}
