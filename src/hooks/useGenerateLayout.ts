import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCreateFloorPlan } from './useFloorPlans';
import { usePlanStore } from '@/store/planStore';

interface GenerateLayoutRequest {
  prompt: string;
  area?: number;
}

interface GenerateLayoutResponse {
  rooms: Array<{
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    type: string;
  }>;
  totalArea: number;
  suggestions: string[];
}

export function useGenerateLayout() {
  const createFloorPlan = useCreateFloorPlan();
  const { setActivePlanId } = usePlanStore();

  return useMutation({
    mutationFn: async (request: GenerateLayoutRequest): Promise<GenerateLayoutResponse> => {
      const { data, error } = await supabase.functions.invoke('generate_layout', {
        body: request,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      // Save the generated plan to the database
      const planName = `Plattegrond ${new Date().toLocaleDateString('nl-NL')}`;
      
      try {
        const savedPlan = await createFloorPlan.mutateAsync({
          name: planName,
          prompt: variables.prompt,
          plan_data: data,
          total_area: data.totalArea,
        });
        
        // Set as active plan
        setActivePlanId(savedPlan.id);
        
        toast.success('Plattegrond gegenereerd en opgeslagen');
      } catch (error) {
        toast.error('Plattegrond gegenereerd maar niet opgeslagen');
      }
    },
    onError: (error) => {
      toast.error('Fout bij genereren plattegrond');
      console.error('Error generating layout:', error);
    },
  });
}