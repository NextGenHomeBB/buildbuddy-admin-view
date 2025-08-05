import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FloorPlan {
  id: string;
  user_id: string;
  name: string;
  prompt: string;
  plan_data: any;
  total_area: number | null;
  created_at: string;
  updated_at: string;
}

export function useFloorPlans() {
  return useQuery({
    queryKey: ['floor-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('floor_plans')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as FloorPlan[];
    },
  });
}

export function useCreateFloorPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (planData: Omit<FloorPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('floor_plans')
        .insert([{ ...planData, user_id: (await supabase.auth.getUser()).data.user?.id }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-plans'] });
      toast.success('Plattegrond opgeslagen');
    },
    onError: (error) => {
      toast.error('Fout bij opslaan plattegrond');
      console.error('Error creating floor plan:', error);
    },
  });
}

export function useUpdateFloorPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FloorPlan> & { id: string }) => {
      const { data, error } = await supabase
        .from('floor_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-plans'] });
      toast.success('Plattegrond bijgewerkt');
    },
    onError: (error) => {
      toast.error('Fout bij bijwerken plattegrond');
      console.error('Error updating floor plan:', error);
    },
  });
}

export function useDeleteFloorPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('floor_plans')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-plans'] });
      toast.success('Plattegrond verwijderd');
    },
    onError: (error) => {
      toast.error('Fout bij verwijderen plattegrond');
      console.error('Error deleting floor plan:', error);
    },
  });
}