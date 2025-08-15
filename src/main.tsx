import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPerformanceMonitoring } from './utils/performance';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { logger } from './utils/logger';
import { initProductionMonitoring } from './utils/production';
import { initBuildOptimizations } from './utils/buildOptimization';
import { logDeploymentReadiness } from './utils/deploymentCheck';

// Initialize performance monitoring
try {
  initPerformanceMonitoring();
  console.log('[INIT] Performance monitoring initialized');
} catch (error) {
  console.error('[INIT] Performance monitoring failed:', error);
}

// Initialize production optimizations
if (import.meta.env.PROD) {
  try {
    initProductionMonitoring();
    initBuildOptimizations();
    logDeploymentReadiness();
    console.log('[INIT] Production optimizations initialized');
  } catch (error) {
    console.error('[INIT] Production optimization failed:', error);
  }
}

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        logger.debug('Service worker registered', { scope: registration.scope });
      })
      .catch((registrationError) => {
        logger.error('Service worker registration failed', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <PerformanceMonitor>
        <App />
      </PerformanceMonitor>
    </ErrorBoundary>
  </StrictMode>
);
