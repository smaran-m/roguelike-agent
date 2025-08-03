export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: any;
  source?: string;
}

export class Logger {
  private static instance: Logger;
  private currentLevel: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  setMaxLogs(max: number): void {
    this.maxLogs = max;
    this.trimLogs();
  }

  private addLog(level: LogLevel, message: string, context?: any, source?: string): void {
    if (level < this.currentLevel) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      source
    };

    this.logs.push(entry);
    this.trimLogs();
    this.outputToConsole(entry);
  }

  private trimLogs(): void {
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  private outputToConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp.toISOString()}] ${entry.source ? `[${entry.source}] ` : ''}`;
    const message = `${prefix}${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.context);
        break;
      case LogLevel.INFO:
        console.info(message, entry.context);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.context);
        break;
      case LogLevel.ERROR:
        console.error(message, entry.context);
        break;
    }
  }

  debug(message: string, context?: any, source?: string): void {
    this.addLog(LogLevel.DEBUG, message, context, source);
  }

  info(message: string, context?: any, source?: string): void {
    this.addLog(LogLevel.INFO, message, context, source);
  }

  warn(message: string, context?: any, source?: string): void {
    this.addLog(LogLevel.WARN, message, context, source);
  }

  error(message: string, context?: any, source?: string): void {
    this.addLog(LogLevel.ERROR, message, context, source);
  }

  // Performance timing utilities
  time(label: string): void {
    console.time(label);
    this.debug(`Started timing: ${label}`, undefined, 'Performance');
  }

  timeEnd(label: string): void {
    console.timeEnd(label);
    this.debug(`Finished timing: ${label}`, undefined, 'Performance');
  }

  // Get recent logs
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Clear all logs
  clearLogs(): void {
    this.logs = [];
  }

  // Export logs as JSON
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Static convenience methods for common usage
  static debug(message: string, context?: any, source?: string): void {
    Logger.getInstance().debug(message, context, source);
  }

  static info(message: string, context?: any, source?: string): void {
    Logger.getInstance().info(message, context, source);
  }

  static warn(message: string, context?: any, source?: string): void {
    Logger.getInstance().warn(message, context, source);
  }

  static error(message: string, context?: any, source?: string): void {
    Logger.getInstance().error(message, context, source);
  }

  static time(label: string): void {
    Logger.getInstance().time(label);
  }

  static timeEnd(label: string): void {
    Logger.getInstance().timeEnd(label);
  }
}