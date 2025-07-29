// Deployment readiness validation

interface DeploymentCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

export async function runDeploymentChecks(): Promise<DeploymentCheck[]> {
  const checks: DeploymentCheck[] = [];

  // 1. Environment Variables Check
  try {
    const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
    const missingVars = requiredVars.filter(envVar => !import.meta.env[envVar]);
    
    checks.push({
      name: 'Environment Variables',
      status: missingVars.length === 0 ? 'pass' : 'fail',
      message: missingVars.length === 0 
        ? 'All required environment variables are present'
        : `Missing: ${missingVars.join(', ')}`
    });
  } catch {
    checks.push({
      name: 'Environment Variables',
      status: 'fail',
      message: 'Failed to check environment variables'
    });
  }

  // 2. Service Worker Check
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      checks.push({
        name: 'Service Worker',
        status: registration ? 'pass' : 'warning',
        message: registration 
          ? 'Service worker is registered and active'
          : 'Service worker not registered (PWA functionality disabled)'
      });
    } catch {
      checks.push({
        name: 'Service Worker',
        status: 'warning',
        message: 'Failed to check service worker status'
      });
    }
  } else {
    checks.push({
      name: 'Service Worker',
      status: 'warning',
      message: 'Service workers not supported in this browser'
    });
  }

  // 3. Performance Check
  if ('performance' in window) {
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationEntry) {
      const loadTime = navigationEntry.loadEventEnd - navigationEntry.fetchStart;
      checks.push({
        name: 'Page Load Performance',
        status: loadTime < 3000 ? 'pass' : loadTime < 5000 ? 'warning' : 'fail',
        message: `Page loaded in ${Math.round(loadTime)}ms`
      });
    }
  }

  // 4. Console Errors Check
  const originalError = console.error;
  let errorCount = 0;
  console.error = (...args) => {
    errorCount++;
    originalError(...args);
  };

  // Wait a bit to catch any immediate errors
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.error = originalError;
  
  checks.push({
    name: 'Console Errors',
    status: errorCount === 0 ? 'pass' : errorCount < 3 ? 'warning' : 'fail',
    message: errorCount === 0 
      ? 'No console errors detected'
      : `${errorCount} console errors detected`
  });

  // 5. Memory Usage Check
  if ('memory' in performance) {
    const memInfo = (performance as any).memory;
    const memoryUsageMB = memInfo.usedJSHeapSize / 1048576;
    checks.push({
      name: 'Memory Usage',
      status: memoryUsageMB < 50 ? 'pass' : memoryUsageMB < 100 ? 'warning' : 'fail',
      message: `Using ${memoryUsageMB.toFixed(1)}MB of memory`
    });
  }

  return checks;
}

export function logDeploymentReadiness() {
  if (import.meta.env.PROD) {
    runDeploymentChecks().then(checks => {
      const passCount = checks.filter(c => c.status === 'pass').length;
      const warnCount = checks.filter(c => c.status === 'warning').length;
      const failCount = checks.filter(c => c.status === 'fail').length;

      console.info('[DEPLOYMENT] Readiness Check Results:', {
        total: checks.length,
        passed: passCount,
        warnings: warnCount,
        failures: failCount,
        details: checks
      });

      if (failCount > 0) {
        console.warn('[DEPLOYMENT] ⚠️ Deployment readiness issues detected');
      } else if (warnCount > 0) {
        console.info('[DEPLOYMENT] ✅ Ready for deployment with warnings');
      } else {
        console.info('[DEPLOYMENT] ✅ Fully ready for production deployment');
      }
    });
  }
}