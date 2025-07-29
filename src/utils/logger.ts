// Production-safe logging utility
const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(`[LOG]`, message, data);
    }
  },
  info: (message: string, data?: any) => {
    if (isDevelopment) {
      console.info(`[INFO]`, message, data);
    }
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR]`, message, error);
  },
  warn: (message: string, data?: any) => {
    if (isDevelopment) {
      console.warn(`[WARN]`, message, data);
    }
  },
  debug: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(`[DEBUG]`, message, data);
    }
  }
};