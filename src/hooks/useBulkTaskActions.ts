import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useBulkTaskActions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const bulkUpdateTasks = useMutation({
    mutationFn: async ({ taskIds, updates }: { 
      taskIds: string[]; 
      updates: Record<string, any> 
    }) => {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .in('id', taskIds);

      if (error) throw error;
    },
    onSuccess: (_, { taskIds, updates }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['list-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['worker-tasks'] });
      
      const action = updates.status ? 'updated' : 
                   updates.assignee ? 'assigned' :
                   updates.list_id !== undefined ? 'moved' : 'updated';
      
      toast({
        title: "Bulk action completed",
        description: `${taskIds.length} task(s) ${action} successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update tasks. Please try again.",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteTasks = useMutation({
    mutationFn: async (taskIds: string[]) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .in('id', taskIds);

      if (error) throw error;
    },
    onSuccess: (_, taskIds) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['list-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['worker-tasks'] });
      
      toast({
        title: "Tasks deleted",
        description: `${taskIds.length} task(s) deleted successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete tasks. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    bulkUpdateTasks,
    bulkDeleteTasks,
  };
}