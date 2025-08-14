import { logger } from './logger';

// App version for cache busting
const APP_VERSION = '1.0.0';
const VERSION_KEY = 'app_version';
const CACHE_PREFIX = 'buildbuddy';

interface CacheManagerOptions {
  forceReload?: boolean;
  clearStorage?: boolean;
}

class CacheManager {
  private static instance: CacheManager;

  private constructor() {}

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Check if app version has changed and clear cache if needed
   */
  public async checkVersionAndClearCache(): Promise<boolean> {
    try {
      const storedVersion = localStorage.getItem(VERSION_KEY);
      
      if (storedVersion !== APP_VERSION) {
        logger.info('App version changed, clearing cache', {
          oldVersion: storedVersion,
          newVersion: APP_VERSION
        });
        
        await this.clearAllCaches();
        localStorage.setItem(VERSION_KEY, APP_VERSION);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to check app version', error);
      return false;
    }
  }

  /**
   * Clear all application caches
   */
  public async clearAllCaches(options: CacheManagerOptions = {}): Promise<void> {
    try {
      // Clear Cache API
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const buildBuddyCaches = cacheNames.filter(name => 
          name.startsWith(CACHE_PREFIX) || name.includes('buildbuddy')
        );
        
        await Promise.all(buildBuddyCaches.map(name => {
          logger.debug('Clearing cache', { cacheName: name });
          return caches.delete(name);
        }));
      }

      // Clear storage if requested
      if (options.clearStorage) {
        this.clearStorage();
      }

      // Unregister service workers
      await this.unregisterServiceWorkers();

      logger.info('All caches cleared successfully');
    } catch (error) {
      logger.error('Failed to clear caches', error);
      throw error;
    }
  }

  /**
   * Clear browser storage
   */
  public clearStorage(): void {
    try {
      // Keep essential auth data but clear everything else
      const authData = localStorage.getItem('sb-ppsjrqfgsznnlojpyjvu-auth-token');
      
      localStorage.clear();
      sessionStorage.clear();
      
      // Restore auth data
      if (authData) {
        localStorage.setItem('sb-ppsjrqfgsznnlojpyjvu-auth-token', authData);
      }
      
      // Set version
      localStorage.setItem(VERSION_KEY, APP_VERSION);
      
      logger.info('Browser storage cleared');
    } catch (error) {
      logger.error('Failed to clear storage', error);
    }
  }

  /**
   * Unregister all service workers
   */
  public async unregisterServiceWorkers(): Promise<void> {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => {
          logger.debug('Unregistering service worker', { scope: registration.scope });
          return registration.unregister();
        }));
      }
    } catch (error) {
      logger.error('Failed to unregister service workers', error);
    }
  }

  /**
   * Force reload with cache bypass
   */
  public forceReload(): void {
    logger.info('Force reloading application');
    window.location.reload();
  }

  /**
   * Get cache status information
   */
  public async getCacheStatus(): Promise<{
    version: string;
    cacheNames: string[];
    storageSize: number;
  }> {
    try {
      const version = localStorage.getItem(VERSION_KEY) || 'unknown';
      
      let cacheNames: string[] = [];
      if ('caches' in window) {
        cacheNames = await caches.keys();
      }

      let storageSize = 0;
      try {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          storageSize = estimate.usage || 0;
        }
      } catch {
        // Storage API not supported
      }

      return { version, cacheNames, storageSize };
    } catch (error) {
      logger.error('Failed to get cache status', error);
      return { version: 'error', cacheNames: [], storageSize: 0 };
    }
  }

  /**
   * Initialize cache manager and check for updates
   */
  public async initialize(): Promise<void> {
    try {
      const versionChanged = await this.checkVersionAndClearCache();
      
      if (versionChanged) {
        logger.info('Cache cleared due to version change');
      }
      
      // Log cache status
      const status = await this.getCacheStatus();
      logger.debug('Cache manager initialized', status);
      
    } catch (error) {
      logger.error('Failed to initialize cache manager', error);
    }
  }
}

export const cacheManager = CacheManager.getInstance();
