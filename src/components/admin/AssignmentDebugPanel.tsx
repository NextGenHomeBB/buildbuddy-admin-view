import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AssignmentDebugPanelProps {
  projectId?: string;
}

export function AssignmentDebugPanel({ projectId }: AssignmentDebugPanelProps) {
  const { user, session } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].substring(0, 8);
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  const runDiagnostics = async () => {
    addLog('🔍 Starting diagnostics...');
    
    try {
      // Check authentication
      addLog(`👤 User: ${user?.id || 'Not authenticated'}`);
      addLog(`🔑 Session: ${session?.access_token ? 'Valid' : 'Missing/Invalid'}`);
      
      if (!projectId) {
        addLog('❌ No project ID provided');
        return;
      }

      // Check project existence and organization
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, name, org_id, created_at')
        .eq('id', projectId)
        .single();

      if (projectError) {
        addLog(`❌ Project query failed: ${projectError.message}`);
      } else {
        addLog(`✅ Project found: "${project.name}" in org ${project.org_id}`);
      }

      // Check user's organization membership
      if (project?.org_id) {
        const { data: orgMember, error: orgError } = await supabase
          .from('organization_members')
          .select('role, status, expires_at')
          .eq('user_id', user?.id)
          .eq('org_id', project.org_id)
          .single();

        if (orgError) {
          addLog(`❌ Org membership query failed: ${orgError.message}`);
        } else {
          addLog(`✅ Org membership: ${orgMember.role} (${orgMember.status})`);
        }
      }

      // Check global admin role
      const { data: adminRole, error: adminError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .eq('role', 'admin')
        .single();

      if (adminError && adminError.code !== 'PGRST116') {
        addLog(`❌ Admin role query failed: ${adminError.message}`);
      } else if (adminRole) {
        addLog(`✅ Global admin role detected`);
      } else {
        addLog(`ℹ️ No global admin role`);
      }

      // Test RPC function with minimal call
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('assign_worker_to_project', {
          p_project_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID to test function existence
          p_user_id: '00000000-0000-0000-0000-000000000000',
          p_role: 'worker'
        });

        if (rpcError) {
          addLog(`🔧 RPC function exists but failed (expected): ${rpcError.message}`);
        } else {
          addLog(`🔧 RPC function exists and callable`);
        }
      } catch (error) {
        addLog(`❌ RPC function error: ${error}`);
      }

      addLog('✅ Diagnostics complete');

    } catch (error: any) {
      addLog(`❌ Diagnostic error: ${error.message}`);
    }
  };

  const testAssignment = async () => {
    if (!projectId || !user?.id) {
      addLog('❌ Missing project ID or user ID for test');
      return;
    }

    addLog('🧪 Testing assignment RPC...');

    try {
      // Test with the current user trying to assign themselves
      const { data: testData, error: testError } = await supabase.rpc('assign_worker_to_project', {
        p_project_id: projectId,
        p_user_id: user.id,
        p_role: 'worker'
      });

      if (testError) {
        addLog(`❌ Test assignment failed: ${testError.message}`);
        addLog(`📋 Error code: ${testError.code}`);
        addLog(`📋 Error details: ${JSON.stringify(testError.details || {})}`);
      } else {
        addLog(`✅ Test assignment successful: ${JSON.stringify(testData)}`);
      }
    } catch (error: any) {
      addLog(`❌ Test assignment exception: ${error.message}`);
    }
  };

  useEffect(() => {
    setDebugInfo({
      projectId,
      userId: user?.id,
      userEmail: user?.email,
      sessionValid: !!session?.access_token,
      timestamp: new Date().toISOString()
    });
  }, [projectId, user, session]);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🐛 Assignment Debug Panel
          <Badge variant="outline">Development</Badge>
        </CardTitle>
        <CardDescription>
          Diagnostic tool for troubleshooting worker assignment issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">Current State</h4>
            <div className="text-sm space-y-1">
              <div>Project ID: <Badge variant="secondary">{projectId || 'None'}</Badge></div>
              <div>User ID: <Badge variant="secondary">{user?.id || 'None'}</Badge></div>
              <div>Session: <Badge variant={session?.access_token ? 'default' : 'destructive'}>
                {session?.access_token ? 'Valid' : 'Invalid'}
              </Badge></div>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Actions</h4>
            <div className="flex flex-col gap-2">
              <Button size="sm" onClick={runDiagnostics}>
                Run Diagnostics
              </Button>
              <Button size="sm" variant="outline" onClick={testAssignment} disabled={!projectId}>
                Test Assignment
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setLogs([])}>
                Clear Logs
              </Button>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Debug Logs</h4>
          <ScrollArea className="h-48 w-full border rounded-md p-2">
            {logs.length === 0 ? (
              <div className="text-sm text-muted-foreground italic">No logs yet. Run diagnostics to start.</div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-xs font-mono whitespace-pre-wrap">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}