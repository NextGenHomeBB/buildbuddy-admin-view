import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import { toast } from '@/hooks/use-toast';

export function AuthDebugPanel() {
  const [debugData, setDebugData] = useState<any>(null);
  const [isDebugging, setIsDebugging] = useState(false);
  const enhancedAuth = useEnhancedAuth();

  const runDebug = async () => {
    setIsDebugging(true);
    try {
      const result = await enhancedAuth.debugAuthState();
      setDebugData(result);
    } catch (error) {
      console.error('Debug failed:', error);
    } finally {
      setIsDebugging(false);
    }
  };

  const validateSession = async () => {
    const result = await enhancedAuth.validateSession('assign_workers');
    if (result) {
      toast({
        title: "Session Valid",
        description: `Role: ${result.role}, Permissions granted: ${result.operation_allowed}`,
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Authentication Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge 
            variant={enhancedAuth.isValid ? "default" : "destructive"}
            className="flex items-center gap-1"
          >
            {enhancedAuth.isValid ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            Session: {enhancedAuth.isValid ? 'Valid' : 'Invalid'}
          </Badge>
          
          <Badge variant="outline">
            Role: {enhancedAuth.role}
          </Badge>
          
          <Badge 
            variant={enhancedAuth.isAdmin ? "default" : "secondary"}
          >
            Admin: {enhancedAuth.isAdmin ? 'Yes' : 'No'}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={runDebug}
            disabled={isDebugging}
            variant="outline"
            size="sm"
          >
            {isDebugging ? 'Running...' : 'Run Full Debug'}
          </Button>
          
          <Button 
            onClick={validateSession}
            variant="outline"
            size="sm"
          >
            Test Worker Assignment
          </Button>
          
          <Button 
            onClick={enhancedAuth.forceReauthentication}
            variant="outline"
            size="sm"
            className="text-blue-600 border-blue-600"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Force Reauth
          </Button>
        </div>

        {debugData && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Debug Results:</h4>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Session:</strong> {debugData.session?.session_valid ? 'Valid' : 'Invalid'}
              </div>
              <div>
                <strong>User ID:</strong> {debugData.session?.user_id || 'None'}
              </div>
              <div>
                <strong>Role:</strong> {debugData.role_function?.result?.role || 'Unknown'}
              </div>
              <div>
                <strong>Role Source:</strong> {debugData.role_function?.result?.source || 'Unknown'}
              </div>
              {debugData.recommendations?.length > 0 && (
                <div>
                  <strong>Recommendations:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {debugData.recommendations.map((rec: string, index: number) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>Use this panel to diagnose authentication issues. The debug function will:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Check session validity and user information</li>
            <li>Verify role assignments and permissions</li>
            <li>Test database function accessibility</li>
            <li>Provide recommendations for fixing issues</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}