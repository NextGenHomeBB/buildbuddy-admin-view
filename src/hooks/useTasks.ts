
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  phase_id?: string;
  project_id: string;
  assignee?: string;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  phase_id?: string;
  assignee?: string;
  start_date?: string;
  end_date?: string;
  duration_days?: number;
  is_scheduled?: boolean;
}

export interface UpdateTaskData {
  id: string;
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
  phase_id?: string;
  project_id?: string;
  assignee?: string;
}

export function useTasks(projectId: string) {
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []).map(task => ({
        ...task,
        status: task.status as Task['status'],
        priority: task.priority as Task['priority']
      }));
    },
    enabled: !!projectId,
    staleTime: 30000, // 30 seconds
  });
}

export function useTasksByPhase(phaseId: string) {
  return useQuery({
    queryKey: ['tasks', 'phase', phaseId],
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('phase_id', phaseId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []).map(task => ({
        ...task,
        status: task.status as Task['status'],
        priority: task.priority as Task['priority']
      }));
    },
    enabled: !!phaseId,
    staleTime: 30000, // 30 seconds
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: CreateTaskData }): Promise<Task> => {
      const { data: task, error } = await supabase
        .from('tasks')
        .insert([{ ...data, project_id: projectId }])
        .select()
        .single();

      if (error) throw error;
      return {
        ...task,
        status: task.status as Task['status'],
        priority: task.priority as Task['priority']
      };
    },
    onMutate: async ({ projectId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', projectId] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', projectId]);
      
      const optimisticTask: Task = {
        id: 'temp-' + Date.now(),
        project_id: projectId,
        created_at: new Date().toISOString(),
        ...data,
      };

      queryClient.setQueryData<Task[]>(['tasks', projectId], (old = []) => 
        [...old, optimisticTask]
      );

      return { previousTasks, projectId };
    },
    onSuccess: (data, variables) => {
      // Invalidate project-specific tasks
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.projectId] });
      // Invalidate all worker task lists to show new assignments
      queryClient.invalidateQueries({ queryKey: ['worker-tasks'] });
      // Invalidate optimized tasks queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      toast({
        title: "Task created",
        description: "New task has been created successfully.",
      });
    },
    onError: (error, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', context.projectId], context.previousTasks);
      }
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UpdateTaskData): Promise<Task> => {
      // Extract id from data to avoid conflict with WHERE clause
      const { id, ...updateFields } = data;
      
      // Only set completed_at if status is being changed to 'done'
      const updateData: any = { ...updateFields };
      
      if (data.status === 'done') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data: task, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return {
        ...task,
        status: task.status as Task['status'],
        priority: task.priority as Task['priority']
      };
    },
    onMutate: async (updatedTask) => {
      // Find the project ID from existing data
      const allTaskQueries = queryClient.getQueriesData({ queryKey: ['tasks'] });
      let projectId: string | undefined;

      for (const [queryKey, queryData] of allTaskQueries) {
        const tasks = queryData as Task[] | undefined;
        if (tasks?.some(task => task.id === updatedTask.id)) {
          projectId = (queryKey as string[])[1];
          break;
        }
      }

      if (!projectId) return;

      await queryClient.cancelQueries({ queryKey: ['tasks', projectId] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', projectId]);

      queryClient.setQueryData<Task[]>(['tasks', projectId], (old = []) =>
        old.map(task =>
          task.id === updatedTask.id
            ? { 
                ...task, 
                ...updatedTask,
                completed_at: updatedTask.status === 'done' ? new Date().toISOString() : task.completed_at
              }
            : task
        )
      );

      return { previousTasks, projectId };
    },
    onSuccess: async (data) => {
      // Invalidate project-specific tasks
      queryClient.invalidateQueries({ queryKey: ['tasks', data.project_id] });
      // Invalidate all worker task lists to show updates
      queryClient.invalidateQueries({ queryKey: ['worker-tasks'] });
      // Invalidate optimized tasks queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      // Update phase and project progress
      try {
        await supabase.functions.invoke('updatePhaseProgress', {
          body: { projectId: data.project_id }
        });
        
        // Invalidate all relevant queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['projects', data.project_id] });
        queryClient.invalidateQueries({ queryKey: ['phases', data.project_id] });
      } catch (error) {
        // Error handling is done by react-query
      }
    },
    onError: (error, variables, context) => {
      if (context?.previousTasks && context?.projectId) {
        queryClient.setQueryData(['tasks', context.projectId], context.previousTasks);
      }
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    },
  });
}
