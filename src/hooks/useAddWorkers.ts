import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface AddWorkersRequest {
  projectId: string;
  workerIds: string[];
}

export function useAddWorkers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ projectId, workerIds }: AddWorkersRequest) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.functions.invoke('assignWorkers', {
        body: {
          projectId,
          workerIds,
          adminId: user.id
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assignments', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-workers', variables.projectId] });
      toast({
        title: "Workers assigned",
        description: `Successfully assigned ${data.assigned} worker(s) to the project.`,
      });
    },
    onError: (error: any) => {
      // Error handling is done by react-query
      toast({
        title: "Error",
        description: error.message || "Failed to assign workers. Please try again.",
        variant: "destructive",
      });
    },
  });
}