import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SecureWorkerRate {
  id: string;
  worker_id: string;
  hourly_rate: number | null;
  monthly_salary: number | null;
  payment_type: string;
  effective_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export const useSecureWorkerRates = (
  workerId?: string,
  effectiveDate?: string
) => {
  return useQuery({
    queryKey: ['secure-worker-rates', workerId, effectiveDate],
    queryFn: async (): Promise<SecureWorkerRate[]> => {
      // Log access attempt for audit trail
      await supabase.rpc('audit_sensitive_operation', {
        operation_type: 'worker_rates_access',
        table_name: 'worker_rates',
        record_id: null,
        sensitive_data_accessed: ['hourly_rate', 'monthly_salary']
      });

      const { data, error } = await supabase.rpc('get_worker_rates_secure', {
        p_worker_id: workerId || null,
        p_effective_date: effectiveDate || null
      });

      if (error) {
        console.error('Error fetching secure worker rates:', error);
        // Log security event for failed access
        await supabase.rpc('log_critical_security_event', {
          event_type: 'WORKER_RATES_ACCESS_FAILED',
          threat_level: 'high',
          details: { error: error.message, workerId, effectiveDate }
        });
        throw error;
      }

      return data || [];
    },
    enabled: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false
  });
};