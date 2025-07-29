// Production optimization utilities

// Build performance monitoring
export function measureBuildPerformance() {
  if (import.meta.env.PROD) {
    // Track build time metrics
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigationEntry) {
      const metrics = {
        dnsLookup: navigationEntry.domainLookupEnd - navigationEntry.domainLookupStart,
        tcpConnection: navigationEntry.connectEnd - navigationEntry.connectStart,
        serverResponse: navigationEntry.responseEnd - navigationEntry.requestStart,
        domProcessing: navigationEntry.domContentLoadedEventEnd - navigationEntry.responseEnd,
        totalPageLoad: navigationEntry.loadEventEnd - navigationEntry.fetchStart,
      };
      
      // Send to monitoring service in production
      console.info('[PRODUCTION] Page load metrics:', metrics);
    }
  }
}

// Bundle size tracking
export function trackBundleSize() {
  if (import.meta.env.PROD && 'connection' in navigator) {
    const connection = (navigator as any).connection;
    const bundleMetrics = {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
    
    console.info('[PRODUCTION] Network conditions:', bundleMetrics);
  }
}

// Error tracking for production
export function trackProductionError(error: Error, context?: string) {
  if (import.meta.env.PROD) {
    // Send to error reporting service
    console.error('[PRODUCTION ERROR]', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }
}

// Performance budget validation
export const PERFORMANCE_BUDGETS = {
  firstContentfulPaint: 2000, // 2 seconds
  largestContentfulPaint: 2500, // 2.5 seconds
  cumulativeLayoutShift: 0.1,
  firstInputDelay: 100, // 100ms
  totalBlockingTime: 300, // 300ms
  bundleSize: 500 * 1024, // 500KB initial bundle
};

export function validatePerformanceBudgets() {
  if (!import.meta.env.PROD) return;

  // Check Core Web Vitals
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const entryName = entry.name;
        const value = (entry as any).value || entry.duration || 0;

        if (entryName === 'first-contentful-paint' && value > PERFORMANCE_BUDGETS.firstContentfulPaint) {
          console.warn('[BUDGET] FCP exceeded budget:', value, 'ms');
        }
        
        if (entryName === 'largest-contentful-paint' && value > PERFORMANCE_BUDGETS.largestContentfulPaint) {
          console.warn('[BUDGET] LCP exceeded budget:', value, 'ms');
        }
      }
    });

    observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
  }
}

// Cache validation
export function validateCacheStrategy() {
  if (!import.meta.env.PROD) return;

  // Check if service worker is active
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      console.info('[PRODUCTION] Service worker active:', registration.active?.state);
    });
  }
}

// Initialize production monitoring
export function initProductionMonitoring() {
  if (!import.meta.env.PROD) return;

  measureBuildPerformance();
  trackBundleSize();
  validatePerformanceBudgets();
  validateCacheStrategy();
  
  // Global error handler
  window.addEventListener('error', (event) => {
    trackProductionError(event.error, 'Global error handler');
  });

  window.addEventListener('unhandledrejection', (event) => {
    trackProductionError(new Error(event.reason), 'Unhandled promise rejection');
  });
}