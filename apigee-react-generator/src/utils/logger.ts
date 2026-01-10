/**
 * Logger utility
 *
 * Configurable logging service that can be disabled in production.
 * Provides structured logging with different levels.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: unknown;
}

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  includeTimestamp: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private config: LoggerConfig;

  constructor() {
    const isDev = import.meta.env.DEV;

    this.config = {
      enabled: true,
      minLevel: isDev ? 'debug' : 'warn',
      includeTimestamp: isDev,
    };
  }

  /**
   * Configure the logger
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  /**
   * Format the log message
   */
  private formatMessage(entry: LogEntry): string {
    const parts: string[] = [];

    if (this.config.includeTimestamp) {
      parts.push(`[${entry.timestamp}]`);
    }

    parts.push(`[${entry.level.toUpperCase()}]`);

    if (entry.context) {
      parts.push(`[${entry.context}]`);
    }

    parts.push(entry.message);

    return parts.join(' ');
  }

  /**
   * Create a log entry
   */
  private createEntry(level: LogLevel, message: string, context?: string, data?: unknown): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      data,
    };
  }

  /**
   * Log at debug level
   */
  debug(message: string, context?: string, data?: unknown): void {
    if (!this.shouldLog('debug')) return;

    const entry = this.createEntry('debug', message, context, data);
    console.debug(this.formatMessage(entry), data !== undefined ? data : '');
  }

  /**
   * Log at info level
   */
  info(message: string, context?: string, data?: unknown): void {
    if (!this.shouldLog('info')) return;

    const entry = this.createEntry('info', message, context, data);
    console.info(this.formatMessage(entry), data !== undefined ? data : '');
  }

  /**
   * Log at warn level
   */
  warn(message: string, context?: string, data?: unknown): void {
    if (!this.shouldLog('warn')) return;

    const entry = this.createEntry('warn', message, context, data);
    console.warn(this.formatMessage(entry), data !== undefined ? data : '');
  }

  /**
   * Log at error level
   */
  error(message: string, context?: string, error?: unknown): void {
    // Errors are always logged
    const entry = this.createEntry('error', message, context, error);
    console.error(this.formatMessage(entry), error !== undefined ? error : '');

    // In production, you could send to a monitoring service here
    // this.sendToMonitoring(entry);
  }

  /**
   * Create a scoped logger with a fixed context
   */
  scope(context: string): ScopedLogger {
    return new ScopedLogger(this, context);
  }
}

/**
 * Scoped logger with a fixed context
 */
class ScopedLogger {
  private logger: Logger;
  private context: string;

  constructor(logger: Logger, context: string) {
    this.logger = logger;
    this.context = context;
  }

  debug(message: string, data?: unknown): void {
    this.logger.debug(message, this.context, data);
  }

  info(message: string, data?: unknown): void {
    this.logger.info(message, this.context, data);
  }

  warn(message: string, data?: unknown): void {
    this.logger.warn(message, this.context, data);
  }

  error(message: string, error?: unknown): void {
    this.logger.error(message, this.context, error);
  }
}

// Export singleton instance
export const logger = new Logger();
