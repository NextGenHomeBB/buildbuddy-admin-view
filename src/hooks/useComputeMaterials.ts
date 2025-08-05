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

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Edge function error: ${error.message || error.toString()}`);
      }

      if (!data) {
        throw new Error('Geen data ontvangen van de materiaalberekening');
      }

      // Validate the response structure
      if (!data.materials || !Array.isArray(data.materials)) {
        throw new Error('Ongeldige response: materialen lijst ontbreekt');
      }

      if (!data.breakdown || typeof data.breakdown !== 'object') {
        throw new Error('Ongeldige response: kostenverdeling ontbreekt');
      }

      return data;
    },
    onSuccess: async (data) => {
      if (!activePlanId) return;

      // Save the generated estimate to the database
      try {
        const user = await supabase.auth.getUser();
        
        if (!user.data.user?.id) {
          throw new Error('Gebruiker niet ingelogd');
        }

        const { error } = await supabase
          .from('material_estimates')
          .insert([{
            plan_id: activePlanId,
            style_id: activeStyleId,
            user_id: user.data.user.id,
            estimate_data: data as any,
            total_cost: data.totalCost,
            currency: data.currency || 'EUR',
          }]);

        if (error) {
          console.error('Database save error:', error);
          throw error;
        }

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['material-estimates'] });
        
        toast.success('Materiaalschatting berekend en opgeslagen');
      } catch (error) {
        console.error('Error saving material estimate:', error);
        toast.error('Materiaalschatting berekend maar niet opgeslagen');
      }
    },
    onError: (error) => {
      console.error('Error computing materials:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Fout bij berekenen materialen';
      
      if (error.message.includes('plan_id is required')) {
        errorMessage = 'Geen plattegrond geselecteerd';
      } else if (error.message.includes('OpenAI API')) {
        errorMessage = 'AI service tijdelijk niet beschikbaar';
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Fout bij verwerken van AI response';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    },
  });
}