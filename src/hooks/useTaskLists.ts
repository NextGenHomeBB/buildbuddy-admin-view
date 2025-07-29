import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TaskList {
  id: string;
  name: string;
  color_hex: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  task_count?: number;
}

export interface CreateTaskListData {
  name: string;
  color_hex?: string;
}

export interface UpdateTaskListData {
  id: string;
  name?: string;
  color_hex?: string;
}

export function useTaskLists() {
  return useQuery({
    queryKey: ['task-lists'],
    queryFn: async (): Promise<TaskList[]> => {
      const { data, error } = await supabase
        .from('task_lists')
        .select(`
          *,
          tasks:tasks(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(list => ({
        ...list,
        task_count: list.tasks?.[0]?.count || 0
      }));
    },
  });
}

export function useListTasks(listId: string) {
  return useQuery({
    queryKey: ['list-tasks', listId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(name),
          assignee_profile:profiles!tasks_assignee_fkey(full_name, avatar_url)
        `)
        .eq('list_id', listId)
        .order('position', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!listId,
  });
}

export function useUnassignedTasks() {
  return useQuery({
    queryKey: ['unassigned-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(name),
          assignee_profile:profiles!tasks_assignee_fkey(full_name, avatar_url)
        `)
        .is('list_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateTaskList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateTaskListData): Promise<TaskList> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: taskList, error } = await supabase
        .from('task_lists')
        .insert({
          name: data.name,
          color_hex: data.color_hex || '#3478F6',
          owner_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return { ...taskList, task_count: 0 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-lists'] });
      toast({
        title: "List created",
        description: "New task list has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create task list. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTaskList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UpdateTaskListData): Promise<TaskList> => {
      const { data: taskList, error } = await supabase
        .from('task_lists')
        .update(data)
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return taskList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-lists'] });
      toast({
        title: "List updated",
        description: "Task list has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task list. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteTaskList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // First, unassign all tasks from this list
      await supabase
        .from('tasks')
        .update({ list_id: null })
        .eq('list_id', id);

      // Then delete the list
      const { error } = await supabase
        .from('task_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-lists'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-tasks'] });
      toast({
        title: "List deleted",
        description: "Task list has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete task list. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useAssignTaskToList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ taskId, listId }: { taskId: string; listId: string | null }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ list_id: listId })
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-lists'] });
      queryClient.invalidateQueries({ queryKey: ['list-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['worker-tasks'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign task to list. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useWorkerTasks(workerId: string) {
  return useQuery({
    queryKey: ['worker-tasks', workerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(name),
          phase:project_phases(name),
          task_list:task_lists(name, color_hex)
        `)
        .eq('assignee', workerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!workerId,
  });
}