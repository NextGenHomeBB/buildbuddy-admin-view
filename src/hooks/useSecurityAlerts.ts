import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SecurityAlert {
  alert_id: string;
  severity: string;
  event_type: string;
  user_id: string | null;
  details: any;
  event_timestamp: string;
  ip_address: string | null;
}

export const useSecurityAlerts = () => {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['security-alerts'],
    queryFn: async (): Promise<SecurityAlert[]> => {
      if (!isAdmin) {
        throw new Error('Admin access required for security alerts');
      }

      const { data, error } = await supabase.rpc('get_security_alerts');

      if (error) {
        console.error('Error fetching security alerts:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user && isAdmin,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refresh every minute for real-time monitoring
    refetchOnWindowFocus: true
  });
};

export const useSecurityMetrics = () => {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['security-metrics'],
    queryFn: async () => {
      if (!isAdmin) {
        throw new Error('Admin access required for security metrics');
      }

      const { data: alerts } = await supabase.rpc('get_security_alerts');
      
      if (!alerts) return null;

      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

      const recent24h = alerts.filter(alert => 
        new Date(alert.event_timestamp) > last24Hours
      );
      
      const recentHour = alerts.filter(alert => 
        new Date(alert.event_timestamp) > lastHour
      );

      const criticalAlerts = alerts.filter(alert => 
        alert.severity === 'critical' || alert.severity === 'high'
      );

      const rateLimitViolations = alerts.filter(alert =>
        alert.event_type.includes('RATE_LIMIT')
      );

      const unauthorizedAccess = alerts.filter(alert =>
        alert.event_type.includes('UNAUTHORIZED')
      );

      return {
        total_alerts: alerts.length,
        alerts_24h: recent24h.length,
        alerts_1h: recentHour.length,
        critical_alerts: criticalAlerts.length,
        rate_limit_violations: rateLimitViolations.length,
        unauthorized_attempts: unauthorizedAccess.length,
        threat_level: criticalAlerts.length > 0 ? 'high' : 
                     recent24h.length > 10 ? 'medium' : 'low'
      };
    },
    enabled: !!user && isAdmin,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000
  });
};