import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuditTrail } from '@/hooks/useSecureDashboard';
import { Shield, AlertTriangle, Clock, User, Globe } from 'lucide-react';

export function SecureAuditTrail() {
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [hoursBack, setHoursBack] = useState(24);

  const { data: auditEntries, isLoading, error, refetch } = useAuditTrail(
    userFilter || undefined,
    actionFilter || undefined,
    hoursBack
  );

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('CRITICAL') || action.includes('VIOLATION')) {
      return <AlertTriangle className="h-4 w-4" />;
    }
    if (action.includes('ACCESS') || action.includes('AUTH')) {
      return <Shield className="h-4 w-4" />;
    }
    if (action.includes('USER') || action.includes('PROFILE')) {
      return <User className="h-4 w-4" />;
    }
    return <Globe className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Audit Trail
          </CardTitle>
          <CardDescription>
            Monitor and analyze security events and access patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Filter by User ID"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            />
            <Input
              placeholder="Filter by Action"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            />
            <Select value={hoursBack.toString()} onValueChange={(value) => setHoursBack(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last Hour</SelectItem>
                <SelectItem value="6">Last 6 Hours</SelectItem>
                <SelectItem value="24">Last 24 Hours</SelectItem>
                <SelectItem value="72">Last 3 Days</SelectItem>
                <SelectItem value="168">Last Week</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => refetch()} variant="outline">
              Refresh
            </Button>
          </div>

          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading audit trail...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-destructive">Failed to load audit trail</p>
            </div>
          )}

          {auditEntries && auditEntries.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No audit entries found for the selected criteria</p>
            </div>
          )}

          {auditEntries && auditEntries.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {auditEntries.map((entry) => (
                <Card key={entry.audit_id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getActionIcon(entry.event_action)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getSeverityColor(entry.event_severity)}>
                            {entry.event_severity}
                          </Badge>
                          <span className="font-medium text-sm">{entry.event_action}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Table: {entry.event_table_name}
                        </div>
                        {entry.event_user_id && (
                          <div className="text-sm text-muted-foreground">
                            User: {entry.event_user_id}
                          </div>
                        )}
                        {entry.event_ip_address && (
                          <div className="text-sm text-muted-foreground">
                            IP: {entry.event_ip_address}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      {new Date(entry.event_timestamp).toLocaleString()}
                    </div>
                  </div>
                  
                  {entry.event_details && Object.keys(entry.event_details).length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                        View Details
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                        {JSON.stringify(entry.event_details, null, 2)}
                      </pre>
                    </details>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}