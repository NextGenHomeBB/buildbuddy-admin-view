import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Robust worker assignment hooks - cache refresh

export interface ProjectWorker {
  id: string;
  user_id: string;
  project_id: string;
  role: string;
  assigned_by?: string;
  assigned_at?: string;
  profiles: {
    full_name: string;
    avatar_url?: string;
  };
}

export interface AvailableWorker {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  is_assigned: boolean;
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

// Get all workers with their assignment status for a project
export function useAvailableWorkersForProject(projectId: string) {
  return useQuery({
    queryKey: ['available-workers', projectId],
    queryFn: async (): Promise<AvailableWorker[]> => {
      // Get all workers from profiles
      const { data: allWorkers, error: workersError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .not('id', 'is', null);

      if (workersError) throw workersError;

      // Get assigned workers for this project
      const { data: assignedWorkers, error: assignedError } = await supabase
        .from('user_project_role')
        .select('user_id')
        .eq('project_id', projectId);

      if (assignedError) throw assignedError;

      const assignedIds = new Set(assignedWorkers?.map(w => w.user_id) || []);

      return (allWorkers || []).map(worker => ({
        id: worker.id,
        full_name: worker.full_name || 'Unknown User',
        role: 'worker',
        avatar_url: worker.avatar_url,
        is_assigned: assignedIds.has(worker.id)
      }));
    },
    enabled: !!projectId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// Robust multi-worker assignment using Promise.all with single assignments
export function useAssignMultipleWorkers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, workerIds }: { projectId: string; workerIds: string[] }) => {
      console.log(`[ASSIGN] Starting bulk assignment of ${workerIds.length} workers to project ${projectId}`);
      
      // Use the new security definer function for bulk assignment
      const { error } = await supabase.rpc('assign_project_workers', {
        p_project: projectId,
        p_user_ids: workerIds
      });

      if (error) {
        console.error(`[ASSIGN] Failed to assign workers:`, {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          projectId,
          workerIds
        });
        
        throw error;
      }
      
      console.log(`[ASSIGN] Successfully assigned ${workerIds.length} workers to project ${projectId}`);
      return { assigned: workerIds.length };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-workers', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['available-workers', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      
      toast({
        title: "Workers Assigned",
        description: `Successfully assigned ${data.assigned} worker(s) to the project.`,
      });
    },
    onError: (error: any) => {
      console.error('[ASSIGN] Batch assignment error:', error);
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign workers. Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Legacy single worker assignment (kept for backward compatibility)
export function useAssignSingleWorkerToProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, userId, role = 'worker' }: { 
      projectId: string; 
      userId: string; 
      role?: string;
    }) => {
      // Validate inputs to prevent "invalid input syntax" errors
      if (!projectId || projectId.trim() === '') {
        throw new Error('Project ID is required and cannot be empty');
      }
      if (!userId || userId.trim() === '') {
        throw new Error('User ID is required and cannot be empty');
      }
      if (!role || role.trim() === '') {
        role = 'worker'; // Default fallback
      }

      console.log('Assigning worker:', { projectId, userId, role });

      // Use upsert to handle existing assignments
      const { data, error } = await supabase
        .from('user_project_role')
        .upsert({ 
          project_id: projectId.trim(), 
          user_id: userId.trim(), 
          role: role.trim()
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

      if (error) {
        console.error('Database assignment error:', error);
        throw error;
      }
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