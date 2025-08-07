import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Link, Unlink, RefreshCw, AlertCircle } from 'lucide-react';
import { useCalendarSyncSettings, useUpdateSyncSettings } from '@/hooks/useCalendarEvents';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CalendarSyncSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalendarSyncSettings({ open, onOpenChange }: CalendarSyncSettingsProps) {
  const { data: syncSettings } = useCalendarSyncSettings();
  const updateSyncSettings = useUpdateSyncSettings();
  
  const [localSettings, setLocalSettings] = useState({
    google_enabled: false,
    outlook_enabled: false,
    apple_enabled: false,
    sync_direction: 'bidirectional' as 'import_only' | 'export_only' | 'bidirectional',
    auto_sync_enabled: true,
    sync_interval_minutes: 5,
    apple_username: '',
    apple_calendar_url: 'https://caldav.icloud.com/'
  });

  const [applePassword, setApplePassword] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Update local state when settings are loaded
  useEffect(() => {
    if (syncSettings) {
      setLocalSettings({
        google_enabled: syncSettings.google_enabled,
        outlook_enabled: syncSettings.outlook_enabled,
        apple_enabled: syncSettings.apple_enabled,
        sync_direction: syncSettings.sync_direction,
        auto_sync_enabled: syncSettings.auto_sync_enabled,
        sync_interval_minutes: syncSettings.sync_interval_minutes,
        apple_username: syncSettings.apple_username || '',
        apple_calendar_url: syncSettings.apple_calendar_url || 'https://caldav.icloud.com/'
      });
    }
  }, [syncSettings]);

  const handleConnectGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar',
          redirectTo: `${window.location.origin}/admin/calendar`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) {
        toast.error('Failed to connect Google Calendar');
        console.error('Google OAuth error:', error);
      }
    } catch (error) {
      toast.error('Failed to connect Google Calendar');
      console.error('Google OAuth error:', error);
    }
  };

  const handleConnectOutlook = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          scopes: 'https://graph.microsoft.com/calendars.readwrite offline_access',
          redirectTo: `${window.location.origin}/admin/calendar`
        }
      });

      if (error) {
        toast.error('Failed to connect Outlook Calendar');
        console.error('Outlook OAuth error:', error);
      }
    } catch (error) {
      toast.error('Failed to connect Outlook Calendar');
      console.error('Outlook OAuth error:', error);
    }
  };

  const handleConnectApple = async () => {
    if (!localSettings.apple_username) {
      toast.error('Please enter your iCloud email address');
      return;
    }

    if (!applePassword) {
      toast.error('Please enter your app-specific password');
      return;
    }

    setIsTestingConnection(true);
    
    try {
      // Store Apple Calendar credentials
      const { error } = await supabase
        .from('apple_calendar_credentials')
        .upsert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          username: localSettings.apple_username,
          app_password: applePassword,
          caldav_url: localSettings.apple_calendar_url
        });

      if (error) {
        throw error;
      }

      // Test the connection by trying to discover calendars
      const testResponse = await supabase.functions.invoke('apple-calendar-sync', {
        body: { test_connection: true, user_id: (await supabase.auth.getUser()).data.user?.id }
      });

      if (testResponse.error) {
        throw new Error(testResponse.error.message || 'Connection test failed');
      }

      // Enable Apple Calendar sync
      handleSettingChange('apple_enabled', true);
      toast.success('Apple Calendar connected successfully!');
      setApplePassword(''); // Clear password for security
    } catch (error) {
      console.error('Apple Calendar connection error:', error);
      toast.error(`Failed to connect: ${error.message}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleDisconnect = async (provider: 'google' | 'outlook' | 'apple') => {
    try {
      if (provider === 'apple') {
        // Remove Apple Calendar credentials
        const { error } = await supabase
          .from('apple_calendar_credentials')
          .delete()
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

        if (error) {
          console.error('Failed to remove Apple credentials:', error);
        }
      } else {
        // Remove OAuth tokens for Google/Outlook
        const { error } = await supabase
          .from('calendar_oauth_tokens')
          .delete()
          .eq('provider', provider);

        if (error) {
          toast.error(`Failed to disconnect ${provider}`);
          return;
        }
      }

      // Update settings
      const updates = provider === 'google' 
        ? { google_enabled: false }
        : provider === 'outlook'
        ? { outlook_enabled: false }
        : { apple_enabled: false, apple_username: '', apple_calendar_url: '' };

      await updateSyncSettings.mutateAsync(updates);
      toast.success(`${provider} Calendar disconnected`);
      
      if (provider === 'apple') {
        setApplePassword('');
      }
    } catch (error) {
      toast.error(`Failed to disconnect ${provider}`);
      console.error(`${provider} disconnect error:`, error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await updateSyncSettings.mutateAsync(localSettings);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Calendar Sync Settings
          </DialogTitle>
          <DialogDescription>
            Configure your calendar sync preferences and connect external calendars.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Calendar Connections */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Calendar Connections</h3>
            
            {/* Apple Calendar */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded bg-[#007AFF]"></div>
                    <CardTitle className="text-base">Apple Calendar</CardTitle>
                    {localSettings.apple_enabled ? (
                      <Badge variant="default">Connected</Badge>
                    ) : (
                      <Badge variant="secondary">Not Connected</Badge>
                    )}
                  </div>
                  
                  {localSettings.apple_enabled ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect('apple')}
                    >
                      <Unlink className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleConnectApple}
                      disabled={isTestingConnection}
                    >
                      {isTestingConnection ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Link className="h-4 w-4 mr-2" />
                      )}
                      {isTestingConnection ? 'Testing...' : 'Connect'}
                    </Button>
                  )}
                </div>
                <CardDescription>
                  Sync with your iCloud Calendar using CalDAV protocol.
                </CardDescription>
              </CardHeader>
              {!localSettings.apple_enabled && (
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="apple-email">iCloud Email</Label>
                    <Input
                      id="apple-email"
                      type="email"
                      placeholder="your-email@icloud.com"
                      value={localSettings.apple_username}
                      onChange={(e) => handleSettingChange('apple_username', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apple-password">App-Specific Password</Label>
                    <Input
                      id="apple-password"
                      type="password"
                      placeholder="xxxx-xxxx-xxxx-xxxx"
                      value={applePassword}
                      onChange={(e) => setApplePassword(e.target.value)}
                    />
                    <div className="text-xs text-muted-foreground">
                      <a 
                        href="https://support.apple.com/en-us/HT204397" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:underline"
                      >
                        Generate app-specific password for Calendar access
                      </a>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="caldav-url">CalDAV Server URL</Label>
                    <Input
                      id="caldav-url"
                      type="url"
                      value={localSettings.apple_calendar_url}
                      onChange={(e) => handleSettingChange('apple_calendar_url', e.target.value)}
                    />
                    <div className="text-xs text-muted-foreground">
                      Use https://caldav.icloud.com/ for iCloud Calendar
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Google Calendar */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded bg-[#4285f4]"></div>
                    <CardTitle className="text-base">Google Calendar</CardTitle>
                    {localSettings.google_enabled ? (
                      <Badge variant="default">Connected</Badge>
                    ) : (
                      <Badge variant="secondary">Not Connected</Badge>
                    )}
                  </div>
                  
                  {localSettings.google_enabled ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect('google')}
                    >
                      <Unlink className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleConnectGoogle}
                    >
                      <Link className="h-4 w-4 mr-2" />
                      Connect
                    </Button>
                  )}
                </div>
                <CardDescription>
                  Sync with your Google Calendar to keep events in sync across platforms.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Outlook Calendar */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded bg-[#0078d4]"></div>
                    <CardTitle className="text-base">Outlook Calendar</CardTitle>
                    {localSettings.outlook_enabled ? (
                      <Badge variant="default">Connected</Badge>
                    ) : (
                      <Badge variant="secondary">Not Connected</Badge>
                    )}
                  </div>
                  
                  {localSettings.outlook_enabled ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect('outlook')}
                    >
                      <Unlink className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleConnectOutlook}
                    >
                      <Link className="h-4 w-4 mr-2" />
                      Connect
                    </Button>
                  )}
                </div>
                <CardDescription>
                  Sync with Microsoft Outlook Calendar for seamless integration.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Sync Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Sync Preferences</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-sync">Automatic Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync calendars in the background
                  </p>
                </div>
                <Switch
                  id="auto-sync"
                  checked={localSettings.auto_sync_enabled}
                  onCheckedChange={(checked) => handleSettingChange('auto_sync_enabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sync-direction">Sync Direction</Label>
                <Select
                  value={localSettings.sync_direction}
                  onValueChange={(value) => handleSettingChange('sync_direction', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bidirectional">
                      Two-way sync (Import & Export)
                    </SelectItem>
                    <SelectItem value="import_only">
                      Import only (External → BuildBuddy)
                    </SelectItem>
                    <SelectItem value="export_only">
                      Export only (BuildBuddy → External)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Choose how events should be synchronized between calendars
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sync-interval">Sync Interval</Label>
                <Select
                  value={localSettings.sync_interval_minutes.toString()}
                  onValueChange={(value) => handleSettingChange('sync_interval_minutes', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Every 5 minutes</SelectItem>
                    <SelectItem value="15">Every 15 minutes</SelectItem>
                    <SelectItem value="30">Every 30 minutes</SelectItem>
                    <SelectItem value="60">Every hour</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  How often to check for calendar changes
                </p>
              </div>
            </div>
          </div>

          {/* Warning */}
          {(localSettings.google_enabled || localSettings.outlook_enabled || localSettings.apple_enabled) && (
            <div className="flex items-start space-x-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Important:</p>
                <p className="text-yellow-700">
                  Changes made in external calendars may take up to {localSettings.sync_interval_minutes} minutes 
                  to appear in BuildBuddy. Manual sync is available for immediate updates.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveSettings} disabled={updateSyncSettings.isPending}>
            {updateSyncSettings.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}