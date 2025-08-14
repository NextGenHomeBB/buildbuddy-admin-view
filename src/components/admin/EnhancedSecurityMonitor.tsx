import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, Eye, EyeOff, RefreshCw } from "lucide-react";
import { useSecurityMonitoring } from "@/hooks/useSecurityMonitoring";
import { useSecurityDashboard } from "@/hooks/useSecurityDashboard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const EnhancedSecurityMonitor = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();
  
  const {
    alerts,
    isMonitoring: hookIsMonitoring,
    startMonitoring,
    getRecentEvents,
    clearAlerts
  } = useSecurityMonitoring();
  
  const { data: dashboardMetrics, refetch: refetchDashboard } = useSecurityDashboard();

  useEffect(() => {
    setIsMonitoring(hookIsMonitoring);
  }, [hookIsMonitoring]);

  const handleStartMonitoring = async () => {
    try {
      await startMonitoring();
      await getRecentEvents();
      toast({
        title: "Security Monitoring Started",
        description: "Real-time security monitoring is now active.",
      });
    } catch (error) {
      toast({
        title: "Monitoring Error",
        description: "Failed to start security monitoring.",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    try {
      await getRecentEvents();
      await refetchDashboard();
      toast({
        title: "Security Data Refreshed",
        description: "Latest security metrics have been loaded.",
      });
    } catch (error) {
      toast({
        title: "Refresh Error",
        description: "Failed to refresh security data.",
        variant: "destructive",
      });
    }
  };

  const handleTokenRotation = async () => {
    try {
      await supabase.rpc('rotate_security_tokens');
      toast({
        title: "Token Rotation Initiated",
        description: "Security tokens have been rotated for enhanced security.",
      });
      await handleRefresh();
    } catch (error) {
      toast({
        title: "Token Rotation Failed",
        description: "Failed to rotate security tokens.",
        variant: "destructive",
      });
    }
  };

  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
  const highAlerts = alerts.filter(alert => alert.severity === 'high');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <h2 className="text-2xl font-bold">Enhanced Security Monitor</h2>
          {isMonitoring && (
            <Badge variant="secondary" className="animate-pulse">
              Live Monitoring
            </Badge>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={!isMonitoring}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? (
              <EyeOff className="h-4 w-4 mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
          
          {!isMonitoring ? (
            <Button onClick={handleStartMonitoring}>
              <Shield className="h-4 w-4 mr-2" />
              Start Monitoring
            </Button>
          ) : (
            <Button variant="outline" onClick={handleTokenRotation}>
              Rotate Tokens
            </Button>
          )}
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Critical Security Alerts ({criticalAlerts.length})
            </CardTitle>
            <CardDescription>
              These alerts require immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalAlerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-2 bg-destructive/10 rounded">
                  <span className="text-sm font-medium">{alert.message}</span>
                  <Badge variant="destructive">{alert.type}</Badge>
                </div>
              ))}
              {criticalAlerts.length > 3 && (
                <div className="text-sm text-muted-foreground">
                  +{criticalAlerts.length - 3} more critical alerts
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* High Priority Alerts */}
      {highAlerts.length > 0 && (
        <Card className="border-orange-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-4 w-4" />
              High Priority Alerts ({highAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {highAlerts.slice(0, 2).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                  <span className="text-sm">{alert.message}</span>
                  <Badge variant="secondary">{alert.type}</Badge>
                </div>
              ))}
              {highAlerts.length > 2 && (
                <div className="text-sm text-muted-foreground">
                  +{highAlerts.length - 2} more high priority alerts
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Metrics Summary */}
      {dashboardMetrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {dashboardMetrics.slice(0, 4).map((metric) => (
            <Card key={metric.metric_name}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {metric.metric_name.replace(/_/g, ' ')}
                    </p>
                    <p className="text-2xl font-bold">{metric.metric_value}</p>
                  </div>
                  <Badge variant={
                    metric.threat_level === 'critical' ? 'destructive' :
                    metric.threat_level === 'high' ? 'destructive' :
                    metric.threat_level === 'medium' ? 'default' : 'secondary'
                  }>
                    {metric.threat_level}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detailed Event List */}
      {showDetails && alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Security Events</CardTitle>
            <CardDescription>
              Detailed view of all security events from the last 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="border rounded p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{alert.message}</span>
                    <div className="flex gap-2">
                      <Badge variant="outline">{alert.type}</Badge>
                      <Badge variant={
                        alert.severity === 'critical' ? 'destructive' :
                        alert.severity === 'high' ? 'destructive' :
                        'secondary'
                      }>
                        {alert.severity}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(alert.timestamp).toLocaleString()}
                  </div>
                  {alert.details && (
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(alert.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Alerts State */}
      {alerts.length === 0 && isMonitoring && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Shield className="h-12 w-12 mx-auto text-green-500" />
              <h3 className="text-lg font-medium">All Clear</h3>
              <p className="text-muted-foreground">
                No security alerts detected. System is operating normally.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedSecurityMonitor;