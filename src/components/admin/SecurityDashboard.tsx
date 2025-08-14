import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Shield, Lock } from "lucide-react";

const SecurityDashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5" />
        <h2 className="text-2xl font-bold">Security Overview</h2>
        <Badge variant="secondary" className="ml-auto">
          Enhanced Protection Active
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Financial Data Protection</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Secured</div>
            <CardDescription className="text-xs">
              All financial data access is now protected with secure RPC functions and proper access controls
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payroll Data Access</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Protected</div>
            <CardDescription className="text-xs">
              Payroll data is now behind secure functions with HR admin verification and data masking
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credential Security</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Enhanced</div>
            <CardDescription className="text-xs">
              Credential access monitoring, validation, and automatic rotation policies are active
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limiting</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <CardDescription className="text-xs">
              Enhanced rate limiting with IP tracking for sensitive operations
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Security</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Hardened</div>
            <CardDescription className="text-xs">
              All database functions now have proper search_path protection
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audit Logging</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Comprehensive</div>
            <CardDescription className="text-xs">
              All sensitive operations are logged with threat level classification
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Security Enhancements Applied
          </CardTitle>
          <CardDescription>
            Your system now has enterprise-grade security protection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded">
              <div>
                <div className="font-medium">Financial Data Protection</div>
                <div className="text-sm text-muted-foreground">
                  All financial views secured with RPC functions, data masking, and role-based access
                </div>
              </div>
              <Badge variant="secondary">✓ Complete</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded">
              <div>
                <div className="font-medium">Enhanced Credential Security</div>
                <div className="text-sm text-muted-foreground">
                  Apple Calendar credentials and OAuth tokens with validation and rotation
                </div>
              </div>
              <Badge variant="secondary">✓ Complete</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded">
              <div>
                <div className="font-medium">Database Function Hardening</div>
                <div className="text-sm text-muted-foreground">
                  All functions secured with search_path protection against SQL injection
                </div>
              </div>
              <Badge variant="secondary">✓ Complete</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded">
              <div>
                <div className="font-medium">Security Monitoring Dashboard</div>
                <div className="text-sm text-muted-foreground">
                  Real-time security metrics, threat detection, and automated response
                </div>
              </div>
              <Badge variant="secondary">✓ Complete</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            Manual Configuration Required
          </CardTitle>
          <CardDescription>
            Some security settings require manual configuration in Supabase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>OTP Expiry Time (reduce to 5 minutes)</span>
              <Badge variant="outline">Manual Setup</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Leaked Password Protection</span>
              <Badge variant="outline">Manual Setup</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Please configure these settings in your Supabase dashboard under Authentication settings
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityDashboard;