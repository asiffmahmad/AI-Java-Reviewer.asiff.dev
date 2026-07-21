import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { EXCLUDED_DIRECTORIES, JAVA_FILE_REGEX } from './constants';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const readdirAsync = promisify(fs.readdir);
const accessAsync = promisify(fs.access);

/**
 * Pure filesystem utility class — no VS Code dependency.
 * All methods are static to avoid instantiation of a utility class.
 */
export class FileUtils {
  private constructor() {
    // Utility class — no instantiation
  }

  // ── Read / Write ────────────────────────────────────────────────────────────

  /**
   * Reads the full text content of a file as UTF-8.
   * @throws {Error} if the file does not exist or is not readable.
   */
  public static async readText(filePath: string): Promise<string> {
    return readFileAsync(filePath, 'utf-8');
  }

  /**
   * Writes text to a file, creating parent directories as needed.
   */
  public static async writeText(filePath: string, content: string): Promise<void> {
    await FileUtils.ensureDirectory(path.dirname(filePath));
    return writeFileAsync(filePath, content, 'utf-8');
  }

  /**
   * Creates a directory and all missing ancestors (equivalent to mkdir -p).
   */
  public static async ensureDirectory(dirPath: string): Promise<void> {
    await mkdirAsync(dirPath, { recursive: true });
  }

  // ── Existence checks ────────────────────────────────────────────────────────

  /**
   * Returns true if the path exists and is accessible.
   */
  public static async fileExists(filePath: string): Promise<boolean> {
    try {
      await accessAsync(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  // ── Directory listing ───────────────────────────────────────────────────────

  /**
   * Lists all files (non-recursively) in a directory.
   * Returns an empty array if the directory does not exist.
   */
  public static async listFiles(dirPath: string): Promise<string[]> {
    try {
      const entries = await readdirAsync(dirPath, { withFileTypes: true });
      return entries
        .filter((e) => e.isFile())
        .map((e) => path.join(dirPath, e.name));
    } catch {
      return [];
    }
  }

  /**
   * Recursively finds all Java source files under rootDir,
   * skipping common build/dependency directories.
   *
   * @param rootDir   Absolute path to start the search
   * @param excludeDirs  Directory names to skip (defaults to EXCLUDED_DIRECTORIES)
   */
  public static async findJavaFiles(
    rootDir: string,
    excludeDirs: readonly string[] = EXCLUDED_DIRECTORIES
  ): Promise<string[]> {
    return FileUtils.findFiles(rootDir, JAVA_FILE_REGEX, excludeDirs);
  }

  /**
   * Recursively finds all files matching a regex pattern under rootDir.
   */
  public static async findFiles(
    rootDir: string,
    pattern: RegExp,
    excludeDirs: readonly string[] = EXCLUDED_DIRECTORIES
  ): Promise<string[]> {
    const results: string[] = [];
    await FileUtils.walk(rootDir, pattern, excludeDirs, results);
    return results;
  }

  // ── Path helpers ────────────────────────────────────────────────────────────

  public static getFileName(filePath: string): string {
    return path.basename(filePath);
  }

  public static getRelativePath(fromDir: string, filePath: string): string {
    return path.relative(fromDir, filePath);
  }

  public static joinPath(...segments: string[]): string {
    return path.join(...segments);
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private static async walk(
    dir: string,
    pattern: RegExp,
    excludeDirs: readonly string[],
    results: string[]
  ): Promise<void> {
    let entries: fs.Dirent[];
    try {
      entries = await readdirAsync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!excludeDirs.includes(entry.name)) {
          await FileUtils.walk(fullPath, pattern, excludeDirs, results);
        }
      } else if (entry.isFile() && pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }
  }
}
