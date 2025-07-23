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
    role: string;
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
            avatar_url,
            role
          )
        `)
        .eq('project_id', projectId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
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
      const { data, error } = await supabase
        .from('user_project_role')
        .insert([{ 
          project_id: projectId, 
          user_id: userId, 
          role 
        }])
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            role
          )
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-workers', variables.projectId] });
      toast({
        title: "Worker assigned",
        description: "Worker has been assigned to the project successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign worker. Please try again.",
        variant: "destructive",
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
      queryClient.invalidateQueries({ queryKey: ['project-workers', variables.projectId] });
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