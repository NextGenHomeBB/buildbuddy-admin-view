import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProjectWorker {
  id: string;
  user_id: string;
  project_id: string;
  role: string;
  profiles: {
    full_name: string;
    avatar_url?: string;
  };
}

export function useProjectWorkers(projectId: string) {
  return useQuery({
    queryKey: ['project-workers', projectId],
    queryFn: async (): Promise<ProjectWorker[]> => {
      const { data, error } = await supabase
        .from('user_project_role')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('project_id', projectId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
    staleTime: 1 * 60 * 1000, // 1 minute for faster updates
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });
}

export function useAssignWorkerToProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, userId, role = 'worker' }: { 
      projectId: string; 
      userId: string; 
      role?: string;
    }) => {
      // Use upsert to handle existing assignments
      const { data, error } = await supabase
        .from('user_project_role')
        .upsert({ 
          project_id: projectId, 
          user_id: userId, 
          role 
        }, {
          onConflict: 'user_id,project_id'
        })
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries for immediate updates
      queryClient.invalidateQueries({ queryKey: ['project-workers', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['workers-with-project-access'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      toast({
        title: "Worker assigned",
        description: "Worker has been assigned to the project successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Assignment error:', error);
      const isAlreadyAssigned = error?.message?.includes('duplicate key') || error?.code === '23505';
      
      toast({
        title: isAlreadyAssigned ? "Worker already assigned" : "Assignment failed",
        description: isAlreadyAssigned 
          ? "This worker is already assigned to the project." 
          : "Failed to assign worker. Please try again.",
        variant: isAlreadyAssigned ? "default" : "destructive",
      });
    },
  });
}

export function useUnassignWorkerFromProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) => {
      const { error } = await supabase
        .from('user_project_role')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries for immediate updates
      queryClient.invalidateQueries({ queryKey: ['project-workers', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['workers-with-project-access'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      toast({
        title: "Worker unassigned",
        description: "Worker has been removed from the project.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unassign worker. Please try again.",
        variant: "destructive",
      });
    },
  });
}