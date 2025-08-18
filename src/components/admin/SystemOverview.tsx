import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { logger } from '@/utils/logger';
import { 
  Shield, 
  Users, 
  Clock, 
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Download,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SystemStats {
  total_users: number;
  active_users: number;
  total_projects: number;
  active_projects: number;
  total_tasks: number;
  completed_tasks: number;
  pending_invitations: number;
}

interface SecurityEvent {
  id: string;
  action: string;
  user_id: string | null;
  table_name: string;
  timestamp: string;
}

export function SystemOverview() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchSystemStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        logger.error('No valid session found');
        return;
      }

      // Fetch system statistics
      const { data, error } = await supabase.functions.invoke('get_system_stats', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        logger.error('Error fetching system stats:', error);
        return;
      }

      setStats(data);
    } catch (error) {
      logger.error('Error fetching system stats:', error);
    }
  };

  const fetchRecentEvents = async () => {
    try {
      // Fetch recent security events
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('id, action, user_id, table_name, timestamp')
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) {
        logger.error('Error fetching security events:', error);
        return;
      }

      setRecentEvents(data || []);
    } catch (error) {
      logger.error('Error fetching security events:', error);
    }
  };

  const refreshData = async (showToast = false) => {
    try {
      setRefreshing(true);
      await Promise.all([fetchSystemStats(), fetchRecentEvents()]);
      
      if (showToast) {
        toast({
          title: 'Data refreshed',
          description: 'System overview has been updated.',
        });
      }
    } catch (error) {
      logger.error('Error refreshing data:', error);
      toast({
        title: 'Refresh failed',
        description: 'Failed to refresh system data.',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const exportSystemReport = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to export reports.',
          variant: 'destructive',
        });
        return;
      }

      // Generate and download system report
      const { data, error } = await supabase.functions.invoke('export_system_report', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      // Create and download file
      const blob = new Blob([data.report], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Report exported',
        description: 'System report has been downloaded.',
      });
    } catch (error) {
      logger.error('Error exporting system report:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export system report.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchSystemStats(), fetchRecentEvents()]);
      setLoading(false);
    };

    loadData();
  }, []);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'ROLE_CHANGE':
        return <Shield className="h-4 w-4 text-amber-500" />;
      case 'INSERT':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'UPDATE':
        return <Activity className="h-4 w-4 text-blue-500" />;
      case 'DELETE':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatEventDescription = (event: SecurityEvent) => {
    switch (event.action) {
      case 'ROLE_CHANGE':
        return `Role change in ${event.table_name}`;
      case 'INSERT':
        return `New record created in ${event.table_name}`;
      case 'UPDATE':
        return `Record updated in ${event.table_name}`;
      case 'DELETE':
        return `Record deleted from ${event.table_name}`;
      default:
        return `${event.action} in ${event.table_name}`;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted animate-pulse rounded w-24" />
                <div className="h-8 bg-muted animate-pulse rounded w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-muted animate-pulse rounded w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="h-4 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Overview</h1>
          <p className="text-muted-foreground mt-2">
            Monitor system health, security, and activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refreshData(true)}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportSystemReport} className="gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* System Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              {stats?.active_users || 0} active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_projects || 0}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              {stats?.active_projects || 0} active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_tasks || 0}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle className="h-3 w-3" />
              {stats?.completed_tasks || 0} completed
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending_invitations || 0}</div>
            <div className="text-xs text-muted-foreground">
              Awaiting response
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Security */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Security Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Recent Security Events
            </CardTitle>
            <CardDescription>
              Latest security and audit log events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentEvents.length > 0 ? (
                recentEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3">
                    {getActionIcon(event.action)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {formatEventDescription(event)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {event.action}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent security events</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
            <CardDescription>
              Key performance and health indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Database</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Healthy
                </Badge>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">API Services</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Operational
                </Badge>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Authentication</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Active
                </Badge>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">Storage</span>
                </div>
                <Badge variant="outline" className="text-amber-800">
                  85% Used
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}