import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAssignSingleWorkerToProject } from './useProjectWorkers';

interface TaskAssignmentRequest {
  title: string;
  description?: string;
  assigneeId: string;
  projectId: string;
  phaseId?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export function useProjectAwareTaskAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const assignWorkerMutation = useAssignSingleWorkerToProject();

  return useMutation({
    mutationFn: async (data: TaskAssignmentRequest) => {
      console.log('Creating task with project-aware assignment:', data);

      // First, check if worker is already assigned to the project
      const { data: existingAssignment } = await supabase
        .from('user_project_role')
        .select('id')
        .eq('user_id', data.assigneeId)
        .eq('project_id', data.projectId)
        .single();

      // If worker is not assigned to project, assign them first
      if (!existingAssignment) {
        console.log('Worker not assigned to project, assigning them first...');
        
        try {
          await assignWorkerMutation.mutateAsync({
            projectId: data.projectId,
            userId: data.assigneeId
          });
        } catch (error) {
          console.error('Failed to assign worker to project:', error);
          throw new Error('Worker could not be assigned to the project. Please try again.');
        }
      }

      // Now create the task
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: data.title,
          description: data.description,
          assignee: data.assigneeId,
          project_id: data.projectId,
          phase_id: data.phaseId,
          due_date: data.dueDate,
          priority: data.priority || 'medium',
          status: 'todo'
        })
        .select(`
          *,
          projects (name),
          profiles (full_name)
        `)
        .single();

      if (taskError) {
        console.error('Error creating task:', taskError);
        throw new Error(`Failed to create task: ${taskError.message}`);
      }

      console.log('Task created successfully:', taskData);
      return taskData;
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['project-workers', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['worker-tasks', data.assignee] });
      queryClient.invalidateQueries({ queryKey: ['available-workers', data.project_id] });
      
      toast({
        title: "Task Created",
        description: `Task "${data.title}" has been assigned successfully.`,
      });
    },
    onError: (error: any) => {
      console.error('Project-aware task assignment error:', error);
      toast({
        title: "Task Assignment Failed",
        description: error.message || "Failed to create and assign task. Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Hook to validate if a worker can be assigned tasks in a project
export function useValidateWorkerProjectAccess() {
  return async (workerId: string, projectId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('user_project_role')
      .select('id')
      .eq('user_id', workerId)
      .eq('project_id', projectId)
      .single();

    return !!data;
  };
}