import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Type definitions for RPC responses
interface AssignmentResult {
  success: boolean;
  assigned_count?: number;
  error_count?: number;
  errors?: Array<{user_id: string; error: string}>;
  message?: string;
}

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
      console.log(`[PROJECT_WORKERS] Fetching workers for project: ${projectId}`);
      
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
          console.error('[PROJECT_WORKERS] Query error:', {
            error,
            code: error.code,
            message: error.message,
            details: error.details,
            projectId
          });
          
          // Handle specific error cases with our new RLS
          if (error.code === '42501') {
            console.warn('[PROJECT_WORKERS] Permission denied - user may not have access to this project');
            return [];
          }
          
          if (error.message?.includes('infinite recursion')) {
            console.warn('[PROJECT_WORKERS] RLS policy recursion detected - this should be fixed now');
            return [];
          }
          
          throw error;
        }
        
        console.log(`[PROJECT_WORKERS] Successfully fetched ${data?.length || 0} workers for project ${projectId}`);
        return data || [];
      } catch (error) {
        console.error('[PROJECT_WORKERS] Fetch failed:', error);
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
      console.log(`[AVAILABLE_WORKERS] Fetching available workers for project: ${projectId}`);
      
      try {
        // Get all workers from profiles
        const { data: allWorkers, error: workersError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .not('id', 'is', null);

        if (workersError) {
          console.error('[AVAILABLE_WORKERS] Error fetching all workers:', workersError);
          throw workersError;
        }

        console.log(`[AVAILABLE_WORKERS] Found ${allWorkers?.length || 0} total workers`);

        // Get assigned workers for this project
        const { data: assignedWorkers, error: assignedError } = await supabase
          .from('user_project_role')
          .select('user_id')
          .eq('project_id', projectId);

        if (assignedError) {
          console.error('[AVAILABLE_WORKERS] Error fetching assigned workers:', assignedError);
          // Don't throw here, just proceed without assignment info
        }

        const assignedIds = new Set(assignedWorkers?.map(w => w.user_id) || []);
        console.log(`[AVAILABLE_WORKERS] Found ${assignedIds.size} assigned workers`);

        const result = (allWorkers || []).map(worker => ({
          id: worker.id,
          full_name: worker.full_name || 'Unknown User',
          role: 'worker',
          avatar_url: worker.avatar_url,
          is_assigned: assignedIds.has(worker.id)
        }));

        console.log(`[AVAILABLE_WORKERS] Returning ${result.length} workers with assignment status`);
        return result;
      } catch (error) {
        console.error('[AVAILABLE_WORKERS] Failed to fetch available workers:', error);
        return [];
      }
    },
    enabled: !!projectId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// Secure multi-worker assignment using RPC function
export function useAssignMultipleWorkers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, workerIds }: { projectId: string; workerIds: string[] }) => {
      console.log(`[ASSIGN] Starting secure assignment of ${workerIds.length} workers to project ${projectId}`);
      
      if (!projectId || !workerIds?.length) {
        console.error('[ASSIGN] Validation failed:', { projectId, workerIds });
        throw new Error('Project ID and at least one Worker ID are required');
      }

      // Enhanced debugging - get current session info
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      console.log('[ASSIGN] Authentication state:', {
        hasSession: !!session,
        hasUser: !!user,
        userId: user?.id,
        sessionError: sessionError?.message,
        userError: userError?.message,
        projectId,
        workerCount: workerIds.length
      });

      if (!session || !user) {
        console.error('[ASSIGN] Authentication failed:', { session: !!session, user: !!user });
        throw new Error('Authentication required. Please log in and try again.');
      }

      // Use the secure RPC function for assignment
      console.log(`[ASSIGN] Calling RPC with params:`, {
        p_project_id: projectId,
        p_user_ids: workerIds,
        p_role: 'worker'
      });

      const { data, error } = await supabase.rpc('assign_multiple_workers_to_project', {
        p_project_id: projectId,
        p_user_ids: workerIds,
        p_role: 'worker'
      });

      if (error) {
        console.error(`[ASSIGN] RPC assignment failed:`, {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          projectId,
          workerIds,
          userId: user?.id
        });
        
        // Provide user-friendly error messages based on the enhanced RPC responses
        if (error.code === '42501') {
          throw new Error('You don\'t have permission to assign workers to this project.');
        } else if (error.message?.includes('Insufficient permissions')) {
          throw new Error('Admin or organization owner permissions required to assign workers.');
        } else if (error.message?.includes('Project not found')) {
          throw new Error('Project not found. Please refresh and try again.');
        } else if (error.message?.includes('User not found')) {
          throw new Error('One or more selected workers were not found. Please refresh and try again.');
        } else if (error.message?.includes('not a member of the project organization')) {
          throw new Error('Selected worker(s) are not members of the project organization.');
        } else if (error.message?.includes('Admin or organization owner role required')) {
          throw new Error('You need admin or organization owner permissions to assign workers.');
        }
        
        throw error;
      }
      
      console.log(`[ASSIGN] RPC response received:`, data);
      const result = data as unknown as AssignmentResult;
      
      const returnValue = {
        assigned: result?.assigned_count || 0,
        alreadyAssigned: workerIds.length - (result?.assigned_count || 0),
        errors: result?.errors || [],
        success: result?.success || false
      };
      
      console.log(`[ASSIGN] Returning result:`, returnValue);
      return returnValue;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-workers', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['available-workers', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      
      let message = '';
      if (data.success && data.assigned > 0) {
        message = `Successfully assigned ${data.assigned} worker(s) to the project.`;
        if (data.alreadyAssigned > 0) {
          message += ` ${data.alreadyAssigned} worker(s) were already assigned.`;
        }
      } else if (data.alreadyAssigned > 0) {
        message = `All ${data.alreadyAssigned} worker(s) were already assigned to this project.`;
      }
      
      toast({
        title: "Assignment Complete",
        description: message,
        variant: data.success && data.assigned > 0 ? "default" : "default",
      });
    },
    onError: (error: any) => {
      console.error('[ASSIGN] Batch assignment error:', error);
      
      let errorMessage = "Failed to assign workers. Please try again.";
      
        if (error.message?.includes('permission denied') || error.message?.includes('insufficient permissions') || error.code === '42501') {
        errorMessage = "You don't have permission to assign workers to this project. Admin or project manager role required.";
      } else if (error.message?.includes('violates row-level security')) {
        errorMessage = "Access denied. Your role doesn't allow worker assignment for this project.";
      } else if (error.message?.includes('Project ID and at least one Worker ID are required')) {
        errorMessage = "Invalid project or worker selection.";
      } else if (error.message?.includes('can_assign_to_project')) {
        errorMessage = "You don't have the required permissions to assign workers to this project.";
      }
      
      toast({
        title: "Assignment Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
}

// Secure single worker assignment using RPC function
export function useAssignSingleWorkerToProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, userId, role = 'worker' }: { 
      projectId: string; 
      userId: string; 
      role?: string;
    }) => {
      if (!projectId || projectId.trim() === '') {
        throw new Error('Project ID is required and cannot be empty');
      }
      if (!userId || userId.trim() === '') {
        throw new Error('User ID is required and cannot be empty');
      }

      console.log('Assigning single worker via RPC:', { projectId, userId, role });

      // Use the secure RPC function for assignment
      const { data, error } = await supabase.rpc('assign_worker_to_project', {
        p_project_id: projectId.trim(),
        p_user_id: userId.trim(),
        p_role: role?.trim() || 'worker'
      });

      if (error) {
        console.error('RPC assignment error:', error);
        throw error;
      }
      
      const result = data as unknown as AssignmentResult;
      return { success: result?.success, message: result?.message, already_assigned: false };
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
      
      if (error.message?.includes('permission denied') || error.message?.includes('insufficient permissions') || error.code === '42501') {
        errorMessage = "You don't have permission to assign workers to this project. Admin or project manager role required.";
      } else if (error.message?.includes('violates row-level security')) {
        errorMessage = "Access denied. Your role doesn't allow worker assignment for this project.";
      } else if (error.message?.includes('Project ID is required')) {
        errorMessage = "Invalid project or worker selection.";
      } else if (error.message?.includes('duplicate key')) {
        errorMessage = "Worker is already assigned to this project.";
      } else if (error.message?.includes('can_assign_to_project')) {
        errorMessage = "You don't have the required permissions to assign workers to this project.";
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