import type * as vscode from 'vscode';
import { EXTENSION_NAME } from './constants';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * Centralised logger wrapping VS Code OutputChannel.
 *
 * - Singleton: initialised once in extension.ts activate()
 * - Formats all entries with ISO timestamp and log level
 * - Debug logging is opt-in (disabled by default)
 * - Accepts the OutputChannel via constructor for testability
 */
export class Logger {
  private static instance: Logger | undefined;
  private readonly channel: vscode.OutputChannel;
  private debugEnabled: boolean;

  private constructor(channel: vscode.OutputChannel) {
    this.channel = channel;
    this.debugEnabled = false;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /**
   * Creates and stores the singleton Logger instance.
   * Must be called once inside extension.ts activate() before any module uses it.
   */
  public static initialize(channel: vscode.OutputChannel): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(channel);
    }
    return Logger.instance;
  }

  /**
   * Returns the singleton instance.
   * Throws if initialize() has not been called yet.
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      throw new Error(
        `${EXTENSION_NAME} Logger has not been initialized. ` +
          'Call Logger.initialize(channel) inside activate() first.'
      );
    }
    return Logger.instance;
  }

  // ── Configuration ───────────────────────────────────────────────────────────

  /** Enable verbose debug-level logging. */
  public enableDebug(): void {
    this.debugEnabled = true;
  }

  // ── Log methods ─────────────────────────────────────────────────────────────

  public debug(message: string, ...context: unknown[]): void {
    if (!this.debugEnabled) {
      return;
    }
    this.write('DEBUG', message, context);
  }

  public info(message: string, ...context: unknown[]): void {
    this.write('INFO', message, context);
  }

  public warn(message: string, ...context: unknown[]): void {
    this.write('WARN', message, context);
  }

  /**
   * Logs an error message. If an Error object is provided, its stack trace
   * is appended on the following line.
   */
  public error(message: string, error?: Error): void {
    this.channel.appendLine(this.format('ERROR', message));
    if (error) {
      this.channel.appendLine(`  Stack: ${error.stack ?? error.message}`);
    }
  }

  /** Brings the Output panel to the foreground without stealing editor focus. */
  public show(): void {
    this.channel.show(true);
  }

  /**
   * Disposes the OutputChannel and resets the singleton so tests can
   * call initialize() again.
   */
  public dispose(): void {
    this.channel.dispose();
    Logger.instance = undefined;
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private write(level: LogLevel, message: string, context: unknown[]): void {
    this.channel.appendLine(this.format(level, message));
    for (const item of context) {
      if (item !== null && item !== undefined) {
        const serialised =
          typeof item === 'string' ? item : JSON.stringify(item, null, 2);
        this.channel.appendLine(`  ${serialised}`);
      }
    }
  }

  private format(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.padEnd(5)}] ${message}`;
  }
}
