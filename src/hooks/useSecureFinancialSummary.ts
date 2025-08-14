import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SecureFinancialSummary {
  project_id: string;
  project_name: string;
  total_budget: number | null;
  total_committed: number | null;
  total_actual: number | null;
  variance: number | null;
  variance_percentage: number | null;
  last_updated: string;
}

export const useSecureFinancialSummary = (
  projectId?: string
) => {
  return useQuery({
    queryKey: ['secure-financial-summary', projectId],
    queryFn: async (): Promise<SecureFinancialSummary[]> => {
      const { data, error } = await supabase.rpc('get_financial_summary_secure', {
        p_project_id: projectId || null
      });

      if (error) {
        console.error('Error fetching secure financial summary:', error);
        throw error;
      }

      return (data || []) as unknown as SecureFinancialSummary[];
    },
    enabled: true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false
  });
};