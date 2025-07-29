// Enhanced production-safe logging utility
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  url?: string;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;

  private constructor() {
    // Singleton pattern
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private createLogEntry(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };
  }

  private getCurrentUserId(): string | undefined {
    // Get user ID from auth context or localStorage
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData).id : undefined;
    } catch {
      return undefined;
    }
  }

  private getSessionId(): string {
    // Generate or retrieve session ID
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift(); // Remove oldest entry
    }
  }

  private async sendToServer(entry: LogEntry): Promise<void> {
    if (!isProduction || entry.level < LogLevel.WARN) return;

    try {
      // Send critical logs to server in production
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      // Fallback to console if server logging fails
      console.error('Failed to send log to server:', error);
    }
  }

  public debug(message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const entry = this.createLogEntry(LogLevel.DEBUG, message, data);
    this.addToBuffer(entry);
    
    if (isDevelopment) {
      console.log(`[DEBUG] ${entry.timestamp}`, message, data);
    }
  }

  public info(message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const entry = this.createLogEntry(LogLevel.INFO, message, data);
    this.addToBuffer(entry);
    
    if (isDevelopment) {
      console.info(`[INFO] ${entry.timestamp}`, message, data);
    }
  }

  public warn(message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const entry = this.createLogEntry(LogLevel.WARN, message, data);
    this.addToBuffer(entry);
    
    console.warn(`[WARN] ${entry.timestamp}`, message, data);
    this.sendToServer(entry);
  }

  public error(message: string, error?: any): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, error);
    this.addToBuffer(entry);
    
    console.error(`[ERROR] ${entry.timestamp}`, message, error);
    this.sendToServer(entry);
    
    // Track error metrics in production
    if (isProduction && typeof window !== 'undefined') {
      try {
        // Send to analytics service
        (window as any).gtag?.('event', 'exception', {
          description: message,
          fatal: false,
        });
      } catch {
        // Ignore analytics errors
      }
    }
  }

  public log(message: string, data?: any): void {
    this.info(message, data);
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public getLogBuffer(): LogEntry[] {
    return [...this.logBuffer];
  }

  public clearLogBuffer(): void {
    this.logBuffer = [];
  }

  public exportLogs(): string {
    return JSON.stringify(this.logBuffer, null, 2);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();