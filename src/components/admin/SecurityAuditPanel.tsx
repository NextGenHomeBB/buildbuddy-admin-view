import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, CheckCircle, RefreshCw, Eye } from 'lucide-react';
import { useSensitiveOperationAudit, useDataIntegrityCheck } from '@/hooks/useSensitiveOperationAudit';
import { formatDistanceToNow } from 'date-fns';

export const SecurityAuditPanel = () => {
  const [selectedTab, setSelectedTab] = useState<'audit' | 'integrity'>('audit');
  const { auditLogs, isLoadingLogs, logsError } = useSensitiveOperationAudit();
  const { 
    integrityResults, 
    integrityIssues, 
    hasIntegrityIssues, 
    isCheckingIntegrity, 
    runIntegrityCheck 
  } = useDataIntegrityCheck();

  const getRiskBadgeVariant = (riskScore: number) => {
    if (riskScore >= 3) return 'destructive';
    if (riskScore >= 2) return 'outline';
    return 'secondary';
  };

  const getRiskLabel = (riskScore: number) => {
    if (riskScore >= 3) return 'High Risk';
    if (riskScore >= 2) return 'Medium Risk';
    return 'Low Risk';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Security Audit Panel</h2>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={selectedTab === 'audit' ? 'default' : 'outline'}
            onClick={() => setSelectedTab('audit')}
            size="sm"
          >
            <Eye className="h-4 w-4 mr-2" />
            Audit Log
          </Button>
          <Button
            variant={selectedTab === 'integrity' ? 'default' : 'outline'}
            onClick={() => setSelectedTab('integrity')}
            size="sm"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Data Integrity
          </Button>
        </div>
      </div>

      {selectedTab === 'audit' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Sensitive Operations Audit Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logsError && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load audit logs. You may not have sufficient permissions.
                </AlertDescription>
              </Alert>
            )}

            {isLoadingLogs ? (
              <div className="text-center py-8">Loading audit logs...</div>
            ) : auditLogs && auditLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Operation</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">
                          {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {log.operation_type}
                          </code>
                        </TableCell>
                        <TableCell>{log.table_name}</TableCell>
                        <TableCell>
                          <Badge variant={getRiskBadgeVariant(log.risk_score)}>
                            {getRiskLabel(log.risk_score)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {log.ip_address || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <details className="cursor-pointer">
                            <summary className="text-xs text-muted-foreground">
                              View Details
                            </summary>
                            <pre className="text-xs mt-2 bg-muted p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.operation_data, null, 2)}
                            </pre>
                          </details>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No audit logs found or insufficient permissions.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedTab === 'integrity' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Data Integrity Checks
              </div>
              <Button
                onClick={() => runIntegrityCheck()}
                disabled={isCheckingIntegrity}
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isCheckingIntegrity ? 'animate-spin' : ''}`} />
                Run Check
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasIntegrityIssues && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {integrityIssues.length} data integrity issue(s) detected. Please review and resolve these issues.
                </AlertDescription>
              </Alert>
            )}

            {isCheckingIntegrity ? (
              <div className="text-center py-8">Running integrity checks...</div>
            ) : integrityResults && integrityResults.length > 0 ? (
              <div className="space-y-4">
                {integrityResults.map((result, index) => (
                  <Card key={index} className={result.status === 'FAIL' ? 'border-destructive' : 'border-green-200'}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {result.status === 'PASS' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          )}
                          <span className="font-medium capitalize">
                            {result.check_name.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <Badge variant={result.status === 'PASS' ? 'default' : 'destructive'}>
                          {result.status}
                        </Badge>
                      </div>
                      
                      {result.status === 'FAIL' && result.issue_count > 0 && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Found {result.issue_count} issue(s)
                        </div>
                      )}
                      
                      {result.details && Object.keys(result.details).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer">
                            View Details
                          </summary>
                          <pre className="text-xs mt-2 bg-muted p-2 rounded overflow-x-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Click "Run Check" to verify data integrity.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};