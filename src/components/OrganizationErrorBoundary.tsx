import React, { Component, ReactNode } from 'react';
import { logger } from '@/utils/logger';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

export class OrganizationErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Organization context error boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount
    });
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      logger.info('Retrying organization context', { retryCount: this.state.retryCount + 1 });
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        retryCount: prevState.retryCount + 1
      }));
    } else {
      logger.warn('Max retries reached for organization context');
    }
  };

  private handleClearCache = async () => {
    try {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Clear storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Unregister service worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }
      
      logger.info('Cache cleared successfully');
      
      // Force reload
      window.location.reload();
    } catch (error) {
      logger.error('Failed to clear cache', error);
    }
  };

  private handleForceReload = () => {
    // Force reload with cache bypass
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const canRetry = this.state.retryCount < this.maxRetries;

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Organization Loading Error</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>There was an error loading your organization context. This might be due to cached data.</p>
                {this.state.error && (
                  <details className="text-xs">
                    <summary>Error details</summary>
                    <pre className="mt-2 whitespace-pre-wrap break-all">
                      {this.state.error.message}
                    </pre>
                  </details>
                )}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              {canRetry && (
                <Button 
                  onClick={this.handleRetry} 
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry ({this.maxRetries - this.state.retryCount} attempts left)
                </Button>
              )}
              
              <Button 
                onClick={this.handleClearCache} 
                className="w-full" 
                variant="outline"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Cache & Reload
              </Button>
              
              <Button 
                onClick={this.handleForceReload} 
                className="w-full" 
                variant="secondary"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Force Reload
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              If the problem persists, please contact support.
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}