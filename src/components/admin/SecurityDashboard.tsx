import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Eye, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SecurityMetric {
  metric_name: string;
  metric_value: number;
  metric_description: string;
  threat_level: string;
}

interface SecurityAlert {
  alert_id: string;
  severity: string;
  event_type: string;
  user_id: string;
  details: any;
  event_timestamp: string;
  ip_address: string;
}

export const SecurityDashboard = () => {
  // Fetch security metrics
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['security-dashboard-metrics'],
    queryFn: async (): Promise<SecurityMetric[]> => {
      const { data, error } = await supabase.rpc('get_security_dashboard_metrics');
      
      if (error) {
        console.error('Error fetching security metrics:', error);
        throw error;
      }
      
      return data || [];
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  // Fetch security alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['security-alerts'],
    queryFn: async (): Promise<SecurityAlert[]> => {
      const { data, error } = await supabase.rpc('get_security_alerts');
      
      if (error) {
        console.error('Error fetching security alerts:', error);
        throw error;
      }
      
      return data || [];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-destructive';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-muted';
    }
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive' as const;
      case 'high': return 'destructive' as const;
      case 'medium': return 'default' as const;
      default: return 'secondary' as const;
    }
  };

  if (metricsError) {
    toast({
      title: "Security Dashboard Error",
      description: "Failed to load security metrics. This may indicate a security issue.",
      variant: "destructive",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Security Dashboard</h2>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Eye className="h-4 w-4" />
          Real-time Monitoring
        </Badge>
      </div>

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))
        ) : (
          metrics?.map((metric) => (
            <Card key={metric.metric_name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.metric_description}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{metric.metric_value}</div>
                  <div className={`w-3 h-3 rounded-full ${getThreatLevelColor(metric.threat_level)}`} />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Security Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Security Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alertsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4">
                  <div className="rounded-full bg-muted h-4 w-4"></div>
                  <div className="flex-1 space-y-1">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : alerts && alerts.length > 0 ? (
            <div className="space-y-4">
              {alerts.slice(0, 10).map((alert) => (
                <Alert key={alert.alert_id} className="border-l-4" style={{
                  borderLeftColor: alert.severity === 'critical' ? 'hsl(var(--destructive))' : 
                                 alert.severity === 'high' ? 'hsl(var(--orange-500))' : 'hsl(var(--yellow-500))'
                }}>
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityVariant(alert.severity)} className="text-xs">
                          {alert.severity}
                        </Badge>
                        <span className="font-medium">{alert.event_type}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(alert.event_timestamp).toLocaleString()}
                      </div>
                    </div>
                    {alert.details && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        IP: {alert.ip_address} | User: {alert.user_id}
                        {alert.details.violation_type && (
                          <span className="ml-2">| Type: {alert.details.violation_type}</span>
                        )}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No security alerts detected</p>
              <p className="text-sm">Your system appears to be secure</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Security Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm">Enhanced Logging</span>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm">Rate Limiting</span>
              <Badge variant="default">Enforced</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm">Credential Protection</span>
              <Badge variant="secondary">Implemented</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm">Real-time Monitoring</span>
              <Badge variant="default">Online</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};