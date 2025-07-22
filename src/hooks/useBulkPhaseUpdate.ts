import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BulkPhaseUpdateData {
  projectId: string;
  phaseIds: string[];
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
}

export interface BulkPhaseUpdateResponse {
  updated_count: number;
  message: string;
}

export function useBulkPhaseUpdate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, phaseIds, status }: BulkPhaseUpdateData): Promise<BulkPhaseUpdateResponse> => {
      const { data, error } = await supabase.functions.invoke('bulk_update_phase_status', {
        body: {
          project_id: projectId,
          phase_ids: phaseIds,
          status,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      return data;
    },
    onMutate: async ({ projectId, phaseIds, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['project', projectId] });
      await queryClient.cancelQueries({ queryKey: ['project-phases', projectId] });

      // Snapshot the previous value
      const previousProject = queryClient.getQueryData(['project', projectId]);
      const previousPhases = queryClient.getQueryData(['project-phases', projectId]);

      // Optimistically update phases
      queryClient.setQueryData(['project-phases', projectId], (old: any) => {
        if (!old) return old;
        
        return old.map((phase: any) => {
          if (phaseIds.includes(phase.id)) {
            return { ...phase, status };
          }
          return phase;
        });
      });

      // Return context with rollback data
      return { previousProject, previousPhases };
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch project and phases data
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-phases', variables.projectId] });
      
      // Show success toast
      toast({
        title: "Phases updated",
        description: data.message,
      });
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousProject) {
        queryClient.setQueryData(['project', variables.projectId], context.previousProject);
      }
      if (context?.previousPhases) {
        queryClient.setQueryData(['project-phases', variables.projectId], context.previousPhases);
      }

      // Show error toast
      toast({
        title: "Error",
        description: error.message || "Failed to update phases. Please try again.",
        variant: "destructive",
      });
    },
  });
}