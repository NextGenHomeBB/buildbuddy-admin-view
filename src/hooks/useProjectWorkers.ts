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
      try {
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

        if (error) {
          console.error('Project workers query error:', error);
          
          // Handle specific error cases
          if (error.message?.includes('infinite recursion')) {
            console.warn('RLS policy recursion detected, retrying with fallback...');
            // Return empty array as fallback
            return [];
          }
          
          if (error.code === '42501') {
            console.warn('Permission denied for project workers query');
            return [];
          }
          
          throw error;
        }
        
        return data || [];
      } catch (error) {
        console.error('Project workers fetch failed:', error);
        // Return empty array as graceful degradation
        return [];
      }
    },
    enabled: !!projectId,
    staleTime: 1 * 60 * 1000, // 1 minute for faster updates
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchOnWindowFocus: true, // Refetch when window gains focus
    retry: (failureCount, error: any) => {
      // Don't retry on permission errors
      if (error?.code === '42501' || error?.message?.includes('infinite recursion')) {
        return false;
      }
      return failureCount < 2;
    },
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
      
      if (!projectId || !workerIds?.length) {
        throw new Error('Project ID and at least one Worker ID are required');
      }

      // Check which workers are already assigned
      const { data: existingAssignments } = await supabase
        .from('user_project_role')
        .select('user_id')
        .eq('project_id', projectId)
        .in('user_id', workerIds);

      const alreadyAssignedIds = new Set(existingAssignments?.map(a => a.user_id) || []);
      const newWorkerIds = workerIds.filter(id => !alreadyAssignedIds.has(id));

      if (newWorkerIds.length === 0) {
        return { assigned: 0, alreadyAssigned: workerIds.length, data: [] };
      }

      const assignments = newWorkerIds.map(userId => ({
        project_id: projectId,
        user_id: userId,
        role: 'worker'
      }));

      const { data, error } = await supabase
        .from('user_project_role')
        .insert(assignments)
        .select();

      if (error) {
        console.error(`[ASSIGN] Failed to assign workers:`, {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          projectId,
          workerIds: newWorkerIds,
          assignments
        });
        
        // Provide more user-friendly error messages
        if (error.code === '23503') {
          throw new Error('Invalid project or user ID. Please refresh and try again.');
        } else if (error.code === '42501') {
          throw new Error('You don\'t have permission to assign workers to this project.');
        } else if (error.message?.includes('infinite recursion')) {
          throw new Error('Database configuration issue. Please contact support.');
        }
        
        throw error;
      }
      
      console.log(`[ASSIGN] Successfully assigned ${newWorkerIds.length} workers to project ${projectId}`, data);
      return { 
        assigned: newWorkerIds.length, 
        alreadyAssigned: alreadyAssignedIds.size,
        data 
      };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-workers', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['available-workers', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      
      let message = '';
      if (data.assigned > 0 && data.alreadyAssigned > 0) {
        message = `Assigned ${data.assigned} new worker(s). ${data.alreadyAssigned} worker(s) were already assigned.`;
      } else if (data.assigned > 0) {
        message = `Successfully assigned ${data.assigned} worker(s) to the project.`;
      } else if (data.alreadyAssigned > 0) {
        message = `All ${data.alreadyAssigned} worker(s) were already assigned to this project.`;
      }
      
      toast({
        title: "Assignment Complete",
        description: message,
        variant: data.assigned > 0 ? "default" : "default",
      });
    },
    onError: (error: any) => {
      console.error('[ASSIGN] Batch assignment error:', error);
      
      let errorMessage = "Failed to assign workers. Please try again.";
      
      if (error.message?.includes('permission denied') || error.message?.includes('insufficient permissions')) {
        errorMessage = "You don't have permission to assign workers to this project.";
      } else if (error.message?.includes('violates row-level security')) {
        errorMessage = "Access denied. Please check your permissions.";
      } else if (error.message?.includes('Project ID and at least one Worker ID are required')) {
        errorMessage = "Invalid project or worker selection.";
      }
      
      toast({
        title: "Assignment Failed",
        description: errorMessage,
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

      // Check if assignment already exists first
      const { data: existingAssignment } = await supabase
        .from('user_project_role')
        .select('id')
        .eq('user_id', userId.trim())
        .eq('project_id', projectId.trim())
        .maybeSingle();

      if (existingAssignment) {
        console.log('👤 Worker already assigned to project');
        return { already_assigned: true, data: existingAssignment };
      }

      // Insert new assignment
      const { data, error } = await supabase
        .from('user_project_role')
        .insert({ 
          project_id: projectId.trim(), 
          user_id: userId.trim(), 
          role: role.trim()
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
      
      return { already_assigned: false, data };
    },
    onSuccess: (result, variables) => {
      // Invalidate all related queries for immediate updates
      queryClient.invalidateQueries({ queryKey: ['project-workers', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['workers-with-project-access'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      
      if (result.already_assigned) {
        toast({
          title: "Worker Already Assigned",
          description: "This worker is already assigned to the project.",
          variant: "default",
        });
      } else {
        toast({
          title: "Worker Assigned",
          description: "Worker has been assigned to the project successfully.",
        });
      }
    },
    onError: (error: any) => {
      console.error('Assignment error:', error);
      
      let errorMessage = "Failed to assign worker. Please try again.";
      
      if (error.message?.includes('permission denied') || error.message?.includes('insufficient permissions')) {
        errorMessage = "You don't have permission to assign workers to this project.";
      } else if (error.message?.includes('violates row-level security')) {
        errorMessage = "Access denied. Please check your permissions.";
      } else if (error.message?.includes('Project ID is required')) {
        errorMessage = "Invalid project or worker selection.";
      } else if (error.message?.includes('duplicate key')) {
        errorMessage = "Worker is already assigned to this project.";
      }
      
      toast({
        title: "Assignment Failed",
        description: errorMessage,
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