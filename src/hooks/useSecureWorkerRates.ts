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
  workerId?: string
) => {
  return useQuery({
    queryKey: ['secure-worker-rates-masked', workerId],
    queryFn: async (): Promise<SecureWorkerRate[]> => {
      const { data, error } = await supabase.rpc('get_worker_rates_masked', {
        p_worker_id: workerId || null
      });

      if (error) {
        console.error('Error fetching secure worker rates:', error);
        throw error;
      }

      return data || [];
    },
    enabled: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false
  });
};