import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreateTaskWithAssignmentRequest {
  title: string;
  description?: string;
  assigneeId: string;
  projectId: string;
  dueDate?: string;
  priority?: string;
}

export function useCreateTaskWithAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateTaskWithAssignmentRequest) => {
      console.log('Creating task with assignment:', data);

      // First, check if the worker is already assigned to the project
      const { data: existingAssignment, error: checkError } = await supabase
        .from('user_project_role')
        .select('user_id')
        .eq('user_id', data.assigneeId)
        .eq('project_id', data.projectId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing assignment:', checkError);
        throw new Error(`Failed to check worker assignment: ${checkError.message}`);
      }

      // Only assign worker to project if not already assigned
      if (!existingAssignment) {
        console.log('Worker not assigned to project, assigning now...');
        const { error: assignmentError } = await supabase
          .from('user_project_role')
          .insert({
            user_id: data.assigneeId,
            project_id: data.projectId,
            role: 'worker'
          });

        if (assignmentError) {
          console.error('Error assigning worker to project:', assignmentError);
          throw new Error(`Failed to assign worker to project: ${assignmentError.message}`);
        }
        console.log('Worker assigned to project successfully');
      } else {
        console.log('Worker already assigned to project, skipping assignment');
      }

      // Create the task
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: data.title,
          description: data.description,
          assignee: data.assigneeId,
          project_id: data.projectId,
          due_date: data.dueDate,
          priority: data.priority || 'medium',
          status: 'todo'
        })
        .select()
        .single();

      if (taskError) {
        console.error('Error creating task:', taskError);
        throw new Error(`Failed to create task: ${taskError.message}`);
      }

      console.log('Task created successfully:', taskData);
      return taskData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-workers', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['worker-projects'] });
      
      toast({
        title: "Success",
        description: "Task created and worker assigned successfully",
      });
    },
    onError: (error: any) => {
      console.error('Create task with assignment error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
    },
  });
}