// Performance monitoring utilities
import { logger } from './logger';

export function measurePerformance<T>(name: string, fn: () => T): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  if (import.meta.env.DEV) {
    logger.debug(`Performance: ${name} took ${end - start} milliseconds`);
  }
  
  return result;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export function virtualizeList<T>(
  items: T[],
  startIndex: number,
  endIndex: number
): T[] {
  return items.slice(startIndex, endIndex);
}

// Bundle size optimization
export function preloadModule(modulePath: string) {
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.href = modulePath;
  document.head.appendChild(link);
}

// Memory optimization
export function cleanupResources() {
  // Force garbage collection in development
  if (typeof (window as any).gc === 'function') {
    (window as any).gc();
  }
}

// Performance observer for Core Web Vitals
export function initPerformanceMonitoring() {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure' && import.meta.env.DEV) {
          logger.debug(`Performance measure: ${entry.name} - ${entry.duration}ms`);
        }
      }
    });
    
    observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
  }
}