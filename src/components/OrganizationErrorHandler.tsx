import React from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { AlertTriangle, RefreshCw, Trash2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface OrganizationErrorHandlerProps {
  children: React.ReactNode;
}

export function OrganizationErrorHandler({ children }: OrganizationErrorHandlerProps) {
  const { 
    loading, 
    error, 
    refreshOrganization, 
    clearCacheAndRetry, 
    retryCount,
    canContinue,
    continueWithoutOrg 
  } = useOrganization();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Loading organization...</p>
        </div>
      </div>
    );
  }

  // Show error state with graceful degradation options
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Organization Access Issue</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            {retryCount < 3 && (
              <Button 
                onClick={refreshOrganization} 
                className="w-full"
                variant="default"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry ({3 - retryCount} attempts left)
              </Button>
            )}
            
            <Button 
              onClick={clearCacheAndRetry} 
              className="w-full" 
              variant="outline"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Cache & Retry
            </Button>
            
            {canContinue && (
              <Button 
                onClick={continueWithoutOrg} 
                className="w-full" 
                variant="secondary"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Continue Without Organization
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground text-center">
            You can continue to use the app with limited organization features, or contact support for help.
          </div>
        </div>
      </div>
    );
  }

  // Everything is working fine, render children
  return <>{children}</>;
}