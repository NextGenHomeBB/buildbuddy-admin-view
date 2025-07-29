import { useEffect } from 'react';
import { logger } from '@/utils/logger';

interface PerformanceMonitorProps {
  children: React.ReactNode;
}

export function PerformanceMonitor({ children }: PerformanceMonitorProps) {
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    // Monitor Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        logger.debug('Performance metric', {
          name: entry.name,
          type: entry.entryType,
          duration: entry.duration,
          startTime: entry.startTime
        });
      }
    });

    observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });

    // Monitor memory usage (if available)
    const checkMemoryUsage = () => {
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        logger.debug('Memory usage', {
          used: Math.round(memInfo.usedJSHeapSize / 1048576),
          total: Math.round(memInfo.totalJSHeapSize / 1048576),
          limit: Math.round(memInfo.jsHeapSizeLimit / 1048576)
        });
      }
    };

    const memoryInterval = setInterval(checkMemoryUsage, 30000); // Check every 30 seconds

    return () => {
      observer.disconnect();
      clearInterval(memoryInterval);
    };
  }, []);

  return <>{children}</>;
}