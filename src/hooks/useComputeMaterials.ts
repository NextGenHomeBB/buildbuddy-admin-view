import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePlanStore } from '@/store/planStore';

interface ComputeMaterialsRequest {
  plan_id: string;
  style_id?: string;
}

interface MaterialItem {
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  category: string;
  supplier?: string;
  sku?: string;
}

interface ComputeMaterialsResponse {
  materials: MaterialItem[];
  totalCost: number;
  breakdown: {
    [category: string]: {
      items: MaterialItem[];
      subtotal: number;
    };
  };
  currency: string;
}

export function useComputeMaterials() {
  const queryClient = useQueryClient();
  const { activePlanId, activeStyleId } = usePlanStore();

  return useMutation({
    mutationFn: async (): Promise<ComputeMaterialsResponse> => {
      if (!activePlanId) {
        throw new Error('Geen actieve plattegrond geselecteerd');
      }

      const { data, error } = await supabase.functions.invoke('compute_materials', {
        body: { 
          plan_id: activePlanId,
          style_id: activeStyleId || undefined
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      if (!activePlanId) return;

      // Save the generated estimate to the database
      try {
        const { error } = await supabase
          .from('material_estimates')
          .insert([{
            plan_id: activePlanId,
            style_id: activeStyleId,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            estimate_data: data as any,
            total_cost: data.totalCost,
            currency: data.currency || 'EUR',
          }]);

        if (error) throw error;

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['material-estimates'] });
        
        toast.success('Materiaalschatting berekend en opgeslagen');
      } catch (error) {
        toast.error('Materiaalschatting berekend maar niet opgeslagen');
        console.error('Error saving material estimate:', error);
      }
    },
    onError: (error) => {
      toast.error('Fout bij berekenen materialen');
      console.error('Error computing materials:', error);
    },
  });
}