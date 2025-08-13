import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { toast } from '@/hooks/use-toast';

interface SecurityAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  details?: any;
}

export const useSecurityMonitoring = () => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Monitor for security events in real-time
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    
    // Subscribe to security audit log changes
    const subscription = supabase
      .channel('security-monitoring')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'security_audit_log',
        filter: `user_id=eq.${supabase.auth.getUser().then(u => u.data.user?.id)}`
      }, (payload) => {
        const event = payload.new;
        
        // Parse security event
        const newValues = typeof event.new_values === 'object' && event.new_values && !Array.isArray(event.new_values) 
          ? event.new_values as Record<string, any> 
          : {};
        
        const alert: SecurityAlert = {
          id: event.id,
          type: event.action,
          severity: newValues.severity || 'medium',
          message: generateAlertMessage(event),
          timestamp: event.timestamp,
          details: event.new_values
        };

        setAlerts(prev => [alert, ...prev.slice(0, 49)]); // Keep last 50 alerts

        // Show toast for high/critical alerts
        if (alert.severity === 'high' || alert.severity === 'critical') {
          toast({
            title: "Security Alert",
            description: alert.message,
            variant: "destructive",
          });
        }

        logger.info('Security alert generated', alert);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      setIsMonitoring(false);
    };
  }, [isMonitoring]);

  // Generate human-readable alert messages
  const generateAlertMessage = (event: any): string => {
    switch (event.action) {
      case 'RATE_LIMIT_EXCEEDED':
        return `Rate limit exceeded for ${event.new_values?.details?.operation || 'unknown operation'}`;
      case 'SUSPICIOUS_TOKEN_USAGE':
        return 'Suspicious activity detected on your authentication tokens';
      case 'CREDENTIAL_ACCESS_FAILED':
        return 'Failed attempt to access sensitive credentials';
      case 'INVALID_INPUT_DETECTED':
        return 'Invalid or potentially malicious input detected';
      default:
        return `Security event: ${event.action}`;
    }
  };

  // Get recent security events
  const getRecentEvents = useCallback(async (limit = 20) => {
    try {
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const formattedAlerts = data.map(event => {
        const newValues = typeof event.new_values === 'object' && event.new_values && !Array.isArray(event.new_values) 
          ? event.new_values as Record<string, any> 
          : {};
        
        return {
          id: event.id,
          type: event.action,
          severity: newValues.severity || 'medium',
          message: generateAlertMessage(event),
          timestamp: event.timestamp,
          details: event.new_values
        };
      });

      setAlerts(formattedAlerts);
      return formattedAlerts;
    } catch (error) {
      logger.error('Failed to fetch security events', error);
      return [];
    }
  }, []);

  // Clear alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Auto-start monitoring when component mounts
  useEffect(() => {
    startMonitoring();
    getRecentEvents();
    
    return () => {
      setIsMonitoring(false);
    };
  }, [startMonitoring, getRecentEvents]);

  return {
    alerts,
    isMonitoring,
    startMonitoring,
    getRecentEvents,
    clearAlerts
  };
};