import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface SecurityDashboardData {
  total_security_events: number;
  critical_events_24h: number;
  rate_limit_violations: number;
  suspicious_login_attempts: number;
  data_access_violations: number;
  top_threat_types: string[];
  recent_violations: any[];
}

export interface AuditTrailEntry {
  audit_id: string;
  event_timestamp: string;
  event_user_id: string;
  event_action: string;
  event_table_name: string;
  event_severity: string;
  event_ip_address: string;
  event_details: any;
}

export function useSecureDashboard() {
  const { toast } = useToast();

  const dashboardQuery = useQuery({
    queryKey: ['security-dashboard'],
    queryFn: async (): Promise<SecurityDashboardData> => {
      try {
        const { data, error } = await supabase.rpc('get_security_dashboard_data' as any);
        
        if (error) {
          logger.error('Error fetching security dashboard data:', error);
          
          if (error.message.includes('Access denied')) {
            toast({
              title: "Access Denied",
              description: "You don't have permission to view security dashboard.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Dashboard Error",
              description: "Unable to load security dashboard data.",
              variant: "destructive",
            });
          }
          
          throw error;
        }

        return data?.[0] || {
          total_security_events: 0,
          critical_events_24h: 0,
          rate_limit_violations: 0,
          suspicious_login_attempts: 0,
          data_access_violations: 0,
          top_threat_types: [],
          recent_violations: []
        };
      } catch (err) {
        logger.error('Failed to fetch security dashboard data:', err);
        throw err;
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000, // Consider stale after 15 seconds
    retry: (failureCount, error: any) => {
      // Don't retry access denied errors
      if (error?.message?.includes('Access denied')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  return {
    data: dashboardQuery.data,
    isLoading: dashboardQuery.isLoading,
    error: dashboardQuery.error,
    refetch: dashboardQuery.refetch,
  };
}

export function useAuditTrail(
  userId?: string,
  actionFilter?: string,
  hoursBack: number = 24
) {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['audit-trail', userId, actionFilter, hoursBack],
    queryFn: async (): Promise<AuditTrailEntry[]> => {
      try {
        const { data, error } = await supabase.rpc('get_audit_trail_secure' as any, {
          p_user_id: userId || null,
          p_action_filter: actionFilter || null,
          p_hours_back: hoursBack,
        });

        if (error) {
          logger.error('Error fetching audit trail:', error);
          
          if (error.message.includes('Access denied')) {
            toast({
              title: "Access Denied",
              description: "You don't have permission to view audit trail.",
              variant: "destructive",
            });
          } else if (error.message.includes('Rate limit exceeded')) {
            toast({
              title: "Rate Limited",
              description: "Too many audit trail requests. Please wait before trying again.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Audit Error",
              description: "Unable to load audit trail data.",
              variant: "destructive",
            });
          }
          
          throw error;
        }

        return data || [];
      } catch (err) {
        logger.error('Failed to fetch audit trail:', err);
        throw err;
      }
    },
    enabled: !!(userId || actionFilter || hoursBack), // Only run when parameters are provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry access denied or rate limit errors
      if (error?.message?.includes('Access denied') || 
          error?.message?.includes('Rate limit exceeded')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}