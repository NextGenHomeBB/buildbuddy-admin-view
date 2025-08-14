import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SecurePhaseCost {
  phase_id: string;
  project_id: string;
  phase_name: string;
  budget: number | null;
  material_cost: number | null;
  labor_cost_planned: number | null;
  labor_cost_actual: number | null;
  expense_cost: number | null;
  total_committed: number | null;
  forecast: number | null;
  variance: number | null;
  last_updated: string;
}

export const useSecurePhaseCosts = (
  projectId?: string
) => {
  return useQuery({
    queryKey: ['secure-phase-costs', projectId],
    queryFn: async (): Promise<SecurePhaseCost[]> => {
      const { data, error } = await supabase.rpc('get_phase_costs_secure', {
        p_project_id: projectId || null
      });

      if (error) {
        console.error('Error fetching secure phase costs:', error);
        throw error;
      }

      return (data || []) as unknown as SecurePhaseCost[];
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
};