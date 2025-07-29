// Production-safe logging utility
const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(message, data);
    }
  },
  error: (message: string, error?: any) => {
    if (isDevelopment) {
      console.error(message, error);
    } else {
      // In production, you might want to send errors to a logging service
      // console.error(message);
    }
  },
  warn: (message: string, data?: any) => {
    if (isDevelopment) {
      console.warn(message, data);
    }
  },
  debug: (message: string, data?: any) => {
    if (isDevelopment) {
      console.debug(message, data);
    }
  }
};