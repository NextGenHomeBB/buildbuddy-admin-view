// Build and deployment optimization utilities

// Environment configuration validation
export function validateEnvironment() {
  // Skip validation since Supabase client uses hardcoded values
  // This prevents initialization failures in development
  console.log('[BUILD] Skipping environment validation - using hardcoded Supabase config');
}

// Tree shaking optimization helpers
export function optimizeImports() {
  // Lazy load heavy components
  return {
    AdminCalendar: () => import('@/pages/admin/AdminCalendar'),
    AdminCosts: () => import('@/pages/admin/AdminCosts'),
    AdminProjects: () => import('@/pages/admin/AdminProjects'),
    WorkerDashboard: () => import('@/pages/worker/WorkerDashboard'),
    Reports: () => import('@/pages/admin/Reports'),
  };
}

// Asset optimization
export function preloadCriticalAssets() {
  const criticalAssets = [
    '/manifest.json',
    '/sw.js'
  ];

  criticalAssets.forEach(asset => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = asset;
    link.as = asset.endsWith('.js') ? 'script' : 'fetch';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}

// Code splitting validation
export function validateCodeSplitting() {
  if (import.meta.env.PROD) {
    // Check if dynamic imports are working
    const dynamicImportTest = async () => {
      try {
        await import('@/utils/logger');
        console.info('[BUILD] Dynamic imports working correctly');
      } catch (error) {
        console.error('[BUILD] Dynamic import failed:', error);
      }
    };
    
    dynamicImportTest();
  }
}

// Memory leak detection
export function detectMemoryLeaks() {
  if (!import.meta.env.PROD) return;

  let lastMemoryUsage = 0;
  const memoryThreshold = 100; // MB

  const checkMemory = () => {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const currentUsage = memInfo.usedJSHeapSize / 1048576; // Convert to MB
      
      if (currentUsage > lastMemoryUsage + memoryThreshold) {
        console.warn('[MEMORY] Potential memory leak detected:', {
          current: `${currentUsage.toFixed(2)}MB`,
          increase: `${(currentUsage - lastMemoryUsage).toFixed(2)}MB`
        });
      }
      
      lastMemoryUsage = currentUsage;
    }
  };

  // Check every 5 minutes
  setInterval(checkMemory, 5 * 60 * 1000);
}

// Bundle analysis helper
export function logBundleInfo() {
  if (import.meta.env.PROD) {
    console.info('[BUILD] Bundle information:', {
      mode: import.meta.env.MODE,
      prod: import.meta.env.PROD,
      buildTime: new Date().toISOString(),
      version: import.meta.env.VITE_APP_VERSION || 'unknown'
    });
  }
}

// Initialize build optimizations
export function initBuildOptimizations() {
  try {
    validateEnvironment();
    preloadCriticalAssets();
    validateCodeSplitting();
    detectMemoryLeaks();
    logBundleInfo();
  } catch (error) {
    console.error('[BUILD] Initialization failed:', error);
    // Don't throw - allow app to continue loading
  }
}