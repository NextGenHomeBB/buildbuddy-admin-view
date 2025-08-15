import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ConsistencyCheck {
  project_id: string;
  project_name: string;
  assigned_workers_count: number;
  user_project_role_count: number;
  is_consistent: boolean;
}

interface RepairResult {
  repaired_projects: number;
  total_projects: number;
}

export function useProjectDataConsistency() {
  return useQuery({
    queryKey: ['project-data-consistency'],
    queryFn: async (): Promise<ConsistencyCheck[]> => {
      const { data, error } = await supabase.rpc('check_project_worker_consistency');
      
      if (error) {
        console.error('Error checking project consistency:', error);
        throw error;
      }
      
      return data || [];
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useRepairProjectAssignments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (): Promise<RepairResult> => {
      const { data, error } = await supabase.rpc('repair_project_worker_assignments');
      
      if (error) {
        throw error;
      }
      
      return data[0];
    },
    onSuccess: (result) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['project-data-consistency'] });
      queryClient.invalidateQueries({ queryKey: ['workers-with-project-access'] });
      queryClient.invalidateQueries({ queryKey: ['project-workers'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      
      toast({
        title: "Data Repair Complete",
        description: `Repaired ${result.repaired_projects} of ${result.total_projects} projects.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Repair Failed",
        description: error.message || "Failed to repair project assignments.",
        variant: "destructive",
      });
    },
  });
}