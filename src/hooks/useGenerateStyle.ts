import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePlanStore } from '@/store/planStore';

interface GenerateStyleRequest {
  plan_id: string;
  prompt: string;
}

interface GenerateStyleResponse {
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    neutral: string[];
  };
  textures: Array<{
    name: string;
    description: string;
    url?: string;
  }>;
  moodImages: string[];
  theme: string;
}

export function useGenerateStyle() {
  const queryClient = useQueryClient();
  const { activePlanId, setActiveStyleId } = usePlanStore();

  return useMutation({
    mutationFn: async (request: Omit<GenerateStyleRequest, 'plan_id'>): Promise<GenerateStyleResponse> => {
      if (!activePlanId) {
        throw new Error('Geen actieve plattegrond geselecteerd');
      }

      const { data, error } = await supabase.functions.invoke('generate_style', {
        body: { ...request, plan_id: activePlanId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      if (!activePlanId) return;

      // Save the generated style to the database
      const styleName = `Stijl ${new Date().toLocaleDateString('nl-NL')}`;
      
      try {
        const { data: savedStyle, error } = await supabase
          .from('plan_styles')
          .insert([{
            plan_id: activePlanId,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            name: styleName,
            prompt: variables.prompt,
            palette: data.palette as any,
            theme: data.theme,
            textures: data.textures as any,
            mood_images: data.moodImages,
          }])
          .select()
          .single();

        if (error) throw error;

        // Set as active style
        setActiveStyleId(savedStyle.id);
        
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['plan-styles'] });
        
        toast.success('Stijl gegenereerd en opgeslagen');
      } catch (error) {
        toast.error('Stijl gegenereerd maar niet opgeslagen');
        console.error('Error saving style:', error);
      }
    },
    onError: (error) => {
      toast.error('Fout bij genereren stijl');
      console.error('Error generating style:', error);
    },
  });
}