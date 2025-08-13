import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { Shield, AlertTriangle, Eye, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export const SecurityDashboard = () => {
  const { alerts, isMonitoring, getRecentEvents, clearAlerts } = useSecurityMonitoring();
  const [stats, setStats] = useState({
    totalAlerts: 0,
    criticalAlerts: 0,
    highAlerts: 0,
    mediumAlerts: 0,
    lowAlerts: 0
  });

  useEffect(() => {
    // Calculate alert statistics
    const newStats = alerts.reduce((acc, alert) => ({
      totalAlerts: acc.totalAlerts + 1,
      criticalAlerts: acc.criticalAlerts + (alert.severity === 'critical' ? 1 : 0),
      highAlerts: acc.highAlerts + (alert.severity === 'high' ? 1 : 0),
      mediumAlerts: acc.mediumAlerts + (alert.severity === 'medium' ? 1 : 0),
      lowAlerts: acc.lowAlerts + (alert.severity === 'low' ? 1 : 0)
    }), {
      totalAlerts: 0,
      criticalAlerts: 0,
      highAlerts: 0,
      mediumAlerts: 0,
      lowAlerts: 0
    });

    setStats(newStats);
  }, [alerts]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Eye className="h-4 w-4" />;
      case 'low':
        return <Clock className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Security Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor security events and threats in real-time
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => getRecentEvents(50)} 
            variant="outline" 
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={clearAlerts} 
            variant="outline" 
            size="sm"
          >
            Clear Alerts
          </Button>
        </div>
      </div>

      {/* Security Status Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              {isMonitoring ? 'Live monitoring' : 'Monitoring offline'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Immediate attention required
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.highAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Review soon
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.mediumAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Routine monitoring
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Informational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Security Status</CardTitle>
          <CardDescription>
            Real-time security monitoring and threat detection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Enhanced Security Active:</strong> Real-time monitoring, credential protection, 
                and advanced rate limiting are enabled. {isMonitoring ? 'Live monitoring is active.' : 'Monitoring is offline.'}
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Credential Protection</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Apple Calendar and OAuth credentials are monitored for suspicious access
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Rate Limiting</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enhanced IP-based rate limiting protects against abuse
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-purple-500" />
                  <span className="font-medium">Audit Logging</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  All security events are logged with IP tracking
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
          <CardDescription>
            Latest security alerts and events from your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No security events recorded</p>
                <p className="text-sm">This indicates good security posture</p>
              </div>
            ) : (
              alerts.slice(0, 10).map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-4 border rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {getSeverityIcon(alert.severity)}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getSeverityColor(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(alert.timestamp), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">
                      Event: {alert.type}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};