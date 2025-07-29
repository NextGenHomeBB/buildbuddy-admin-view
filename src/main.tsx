import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPerformanceMonitoring } from './utils/performance';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { logger } from './utils/logger';

// Initialize performance monitoring
initPerformanceMonitoring();

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
