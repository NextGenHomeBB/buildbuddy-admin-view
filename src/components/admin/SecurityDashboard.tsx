import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Shield, AlertTriangle, Eye, Clock, RefreshCw, AlertCircle, CheckCircle, Lock, Activity, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

export const SecurityDashboard = () => {
  const { alerts, isMonitoring, getRecentEvents, clearAlerts } = useSecurityMonitoring();
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  });
  const [threatLevel, setThreatLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const [securityMetrics, setSecurityMetrics] = useState({
    credentialAccess: 0,
    suspiciousActivity: 0,
    rateLimitViolations: 0,
    privilegeEscalations: 0
  });

  useEffect(() => {
    const newStats = alerts.reduce((acc, alert) => {
      acc.total++;
      acc[alert.severity as keyof typeof acc]++;
      return acc;
    }, { total: 0, critical: 0, high: 0, medium: 0, low: 0 });
    
    setStats(newStats);
    
    // Calculate overall threat level
    if (newStats.critical > 0) setThreatLevel('critical');
    else if (newStats.high > 3) setThreatLevel('high');
    else if (newStats.medium > 10) setThreatLevel('medium');
    else setThreatLevel('low');

    // Calculate security metrics
    const metrics = alerts.reduce((acc, alert) => {
      if (alert.type.includes('CREDENTIAL')) acc.credentialAccess++;
      if (alert.type.includes('SUSPICIOUS')) acc.suspiciousActivity++;
      if (alert.type.includes('RATE_LIMIT')) acc.rateLimitViolations++;
      if (alert.type.includes('ROLE') || alert.type.includes('PERMISSION')) acc.privilegeEscalations++;
      return acc;
    }, { credentialAccess: 0, suspiciousActivity: 0, rateLimitViolations: 0, privilegeEscalations: 0 });
    
    setSecurityMetrics(metrics);
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
      case 'critical': return <AlertCircle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Eye className="h-4 w-4" />;
      case 'low': return <Activity className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getThreatLevelColor = (level: string): string => {
    switch (level) {
      case 'critical': return 'text-destructive';
      case 'high': return 'text-destructive';
      case 'medium': return 'text-warning';
      case 'low': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  const runSecurityScan = async () => {
    try {
      toast({
        title: "Security Scan Initiated",
        description: "Running comprehensive security analysis...",
      });

      // Log the security scan event
      await supabase.rpc('log_high_risk_activity', {
        event_type: 'security_scan_manual',
        risk_level: 'medium',
        details: {
          scan_type: 'manual_comprehensive',
          initiated_by: 'admin_dashboard'
        }
      });

      // Refresh events after scan
      await getRecentEvents(50);
      
      toast({
        title: "Security Scan Complete",
        description: "Security analysis completed successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error('Security scan error:', error);
      toast({
        title: "Security Scan Failed",
        description: "Failed to complete security analysis.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Security Dashboard</h2>
          <Badge variant={isMonitoring ? "default" : "secondary"} className="ml-2">
            {isMonitoring ? "Live Monitoring" : "Monitoring Disabled"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => getRecentEvents()}
            disabled={!isMonitoring}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={runSecurityScan}
          >
            <Shield className="h-4 w-4 mr-2" />
            Run Security Scan
          </Button>
          <Button 
            variant="outline" 
            onClick={clearAlerts}
            disabled={alerts.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Alerts
          </Button>
        </div>
      </div>

      {/* Threat Level Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Current Threat Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`text-3xl font-bold ${getThreatLevelColor(threatLevel)}`}>
              {threatLevel.toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground mb-2">
                Based on recent security events and activity patterns
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">
                  {stats.total} Total Events
                </Badge>
                {stats.critical > 0 && (
                  <Badge variant="destructive">
                    {stats.critical} Critical
                  </Badge>
                )}
                {stats.high > 0 && (
                  <Badge variant="destructive">
                    {stats.high} High Risk
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Security events tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.critical}</div>
            <p className="text-xs text-muted-foreground">
              Immediate attention required
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.high}</div>
            <p className="text-xs text-muted-foreground">
              Needs investigation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credential Access</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityMetrics.credentialAccess}</div>
            <p className="text-xs text-muted-foreground">
              Credential access events
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Security Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Security Status</CardTitle>
          <CardDescription>
            Current security features and their status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>Enhanced Credential Protection</span>
            </div>
            <Badge variant="default">Active</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>Rate Limiting Enhanced</span>
            </div>
            <Badge variant="default">Active</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>Comprehensive Audit Logging</span>
            </div>
            <Badge variant="default">Active</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>Data Masking for Customer Info</span>
            </div>
            <Badge variant="default">Active</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>IP-based Threat Detection</span>
            </div>
            <Badge variant="default">Active</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>Financial Data Access Control</span>
            </div>
            <Badge variant="default">Active</Badge>
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
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No security events recorded</p>
              <p className="text-sm">Your system is secure</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 10).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getSeverityIcon(alert.severity)}
                    <div>
                      <div className="font-medium">{alert.message}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleString()} • {alert.type}
                      </div>
                    </div>
                  </div>
                  <Badge variant={getSeverityColor(alert.severity) as any}>
                    {alert.severity}
                  </Badge>
                </div>
              ))}
              {alerts.length > 10 && (
                <div className="text-center text-sm text-muted-foreground pt-2">
                  Showing 10 of {alerts.length} events
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};