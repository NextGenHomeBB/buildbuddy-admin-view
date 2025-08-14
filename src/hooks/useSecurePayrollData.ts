import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SecurePayrollData {
  worker_id: string;
  worker_name: string;
  pay_period_start: string;
  pay_period_end: string;
  hours_worked: number | null;
  regular_pay: number | null;
  overtime_pay: number | null;
  gross_pay: number | null;
  net_pay: number | null;
  payment_status: string;
}

export const useSecurePayrollData = (
  workerId?: string,
  startDate?: string,
  endDate?: string
) => {
  return useQuery({
    queryKey: ['secure-payroll-data', workerId, startDate, endDate],
    queryFn: async (): Promise<SecurePayrollData[]> => {
      const { data, error } = await supabase.rpc('get_payroll_data_secure', {
        p_worker_id: workerId || null,
        p_date_from: startDate || null,
        p_date_to: endDate || null
      });

      if (error) {
        console.error('Error fetching secure payroll data:', error);
        throw error;
      }

      return (data || []) as unknown as SecurePayrollData[];
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
};