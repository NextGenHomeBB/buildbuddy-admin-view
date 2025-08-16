import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SecurityDashboard } from '@/components/admin/SecurityDashboard';
import { SecureAuditTrail } from '@/components/admin/SecureAuditTrail';
import { SecurityAuditPanel } from '@/components/admin/SecurityAuditPanel';
import { useSecureDashboard } from '@/hooks/useSecureDashboard';
import { Shield, AlertTriangle, TrendingUp, Lock } from 'lucide-react';

export default function AdminSecurityAudit() {
  const { data: dashboardData, isLoading } = useSecureDashboard();

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Center</h1>
          <p className="text-muted-foreground">
            Comprehensive security monitoring and audit trail for your organization
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          <Shield className="h-4 w-4 mr-1" />
          Enhanced Security Active
        </Badge>
      </div>

      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Events</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : dashboardData?.total_security_events || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total events tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {isLoading ? '...' : dashboardData?.critical_events_24h || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Violations</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {isLoading ? '...' : dashboardData?.rate_limit_violations || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Rate limit breaches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Access Violations</CardTitle>
            <Lock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {isLoading ? '...' : dashboardData?.data_access_violations || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Unauthorized attempts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Security Audit Panel */}
      <SecurityAuditPanel />

      {/* Security Dashboard */}
      <SecurityDashboard />

      {/* Audit Trail */}
      <SecureAuditTrail />

      {/* Security Implementation Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Implementation Status
          </CardTitle>
          <CardDescription>
            Overview of security measures implemented in your system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-green-600">✅ Implemented Security Features</h4>
              <ul className="space-y-1 text-sm">
                <li>• Enhanced rate limiting with IP tracking</li>
                <li>• Secure worker salary data access (admin-only)</li>
                <li>• Comprehensive audit logging</li>
                <li>• Data masking for sensitive information</li>
                <li>• Row-level security policies</li>
                <li>• Calendar credential protection</li>
                <li>• OAuth token security monitoring</li>
                <li>• Financial data access control</li>
                <li>• Critical security event logging</li>
                <li>• Immutable database function paths</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-blue-600">🔒 Security Controls Active</h4>
              <ul className="space-y-1 text-sm">
                <li>• Admin-only access to salary information</li>
                <li>• Blocked direct access to worker rates table</li>
                <li>• Enhanced profile access restrictions</li>
                <li>• Secure audit trail with rate limiting</li>
                <li>• Real-time security event monitoring</li>
                <li>• IP-based threat detection</li>
                <li>• Automatic violation logging</li>
                <li>• Comprehensive access control validation</li>
                <li>• Database security hardening</li>
                <li>• Encrypted sensitive data storage</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}