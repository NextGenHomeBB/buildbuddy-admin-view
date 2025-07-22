import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Bell, 
  Shield, 
  Users, 
  Database,
  Mail,
  Palette
} from 'lucide-react';

export function AdminSettings() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your workspace preferences and configurations.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* General Settings */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>
              Basic configuration for your workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input 
                id="workspace-name" 
                placeholder="BuildBuddy Admin" 
                defaultValue="BuildBuddy Admin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input 
                id="company-name" 
                placeholder="Your Company" 
                defaultValue="BuildBuddy Inc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Admin Email</Label>
              <Input 
                id="admin-email" 
                type="email" 
                placeholder="admin@company.com"
                defaultValue="admin@buildbuddy.com"
              />
            </div>
            <Button className="admin-button-primary">Save Changes</Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive email updates</p>
              </div>
              <Switch id="email-notifications" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="project-updates">Project Updates</Label>
                <p className="text-sm text-muted-foreground">Notify on project changes</p>
              </div>
              <Switch id="project-updates" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="user-activity">User Activity</Label>
                <p className="text-sm text-muted-foreground">Notify on user actions</p>
              </div>
              <Switch id="user-activity" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="weekly-reports">Weekly Reports</Label>
                <p className="text-sm text-muted-foreground">Send weekly summaries</p>
              </div>
              <Switch id="weekly-reports" defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>
              Manage security and access controls
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="two-factor">Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">Require 2FA for all users</p>
              </div>
              <Switch id="two-factor" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="session-timeout">Auto Session Timeout</Label>
                <p className="text-sm text-muted-foreground">Logout inactive users</p>
              </div>
              <Switch id="session-timeout" defaultChecked />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="password-policy">Password Policy</Label>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Minimum 8 characters</p>
                <p>• Include uppercase and lowercase letters</p>
                <p>• Include numbers and special characters</p>
              </div>
            </div>
            <Button variant="outline">Configure Password Policy</Button>
          </CardContent>
        </Card>

        {/* Team Management */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Management
            </CardTitle>
            <CardDescription>
              Control team access and permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-invite">Auto-accept Invitations</Label>
                <p className="text-sm text-muted-foreground">Skip manual approval</p>
              </div>
              <Switch id="auto-invite" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="guest-access">Guest Access</Label>
                <p className="text-sm text-muted-foreground">Allow guest users</p>
              </div>
              <Switch id="guest-access" defaultChecked />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Default Role for New Users</Label>
              <select className="w-full px-3 py-2 border border-input rounded-md bg-background">
                <option value="developer">Developer</option>
                <option value="project_manager">Project Manager</option>
                <option value="client">Client</option>
              </select>
            </div>
            <Button variant="outline">Manage Roles & Permissions</Button>
          </CardContent>
        </Card>

        {/* Integration Settings */}
        <Card className="admin-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Integrations
            </CardTitle>
            <CardDescription>
              Connect with external services and tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Mail className="h-8 w-8 text-primary" />
                  <div>
                    <h4 className="font-semibold">Email Service</h4>
                    <p className="text-sm text-muted-foreground">SMTP Configuration</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              
              <div className="p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Database className="h-8 w-8 text-primary" />
                  <div>
                    <h4 className="font-semibold">Database</h4>
                    <p className="text-sm text-muted-foreground">Backup & Sync</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              
              <div className="p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Palette className="h-8 w-8 text-primary" />
                  <div>
                    <h4 className="font-semibold">Theme</h4>
                    <p className="text-sm text-muted-foreground">Customize Appearance</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}