import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

interface SecurityMetric {
  metric_name: string;
  metric_value: number;
  metric_description: string;
  threat_level: string;
}

export const useSecurityDashboard = () => {
  const { isAdmin } = useAuthContext();

  return useQuery({
    queryKey: ['security-dashboard'],
    queryFn: async (): Promise<SecurityMetric[]> => {
      if (!isAdmin) {
        throw new Error('Access denied: only administrators can access security dashboard');
      }

      const { data, error } = await supabase.rpc('get_security_dashboard');

      if (error) {
        console.error('Error fetching security dashboard:', error);
        throw error;
      }

      return data || [];
    },
    enabled: isAdmin,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 1000 * 30, // 30 seconds
  });
};

export const usePayrollDataSecure = (workerId?: string, dateFrom?: string, dateTo?: string) => {
  const { isAdmin } = useAuthContext();

  return useQuery({
    queryKey: ['payroll-data-secure', workerId, dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_payroll_data_secure', {
        p_worker_id: workerId || null,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null
      });

      if (error) {
        console.error('Error fetching payroll data:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!isAdmin || !!workerId, // Enable for admins or when checking own data
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useFinancialSummarySecure = (projectId?: string) => {
  return useQuery({
    queryKey: ['financial-summary-secure', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_financial_summary_secure', {
        p_project_id: projectId || null
      });

      if (error) {
        console.error('Error fetching financial summary:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};