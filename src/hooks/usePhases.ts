import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  start_date?: string;
  end_date?: string;
  progress: number;
  created_at: string;
  updated_at?: string;
}

export interface CreatePhaseData {
  name: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  start_date?: string;
  end_date?: string;
}

export interface UpdatePhaseData extends CreatePhaseData {
  id: string;
  project_id?: string;
}

export function usePhases(projectId: string) {
  return useQuery({
    queryKey: ['phases', projectId],
    queryFn: async (): Promise<ProjectPhase[]> => {
      const { data, error } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []).map(phase => ({
        ...phase,
        status: phase.status as ProjectPhase['status']
      }));
    },
    enabled: !!projectId,
  });
}

export function useCreatePhase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: CreatePhaseData }): Promise<ProjectPhase> => {
      const { data: phase, error } = await supabase
        .from('project_phases')
        .insert([{ ...data, project_id: projectId }])
        .select()
        .single();

      if (error) throw error;
      return { ...phase, status: phase.status as ProjectPhase['status'] };
    },
    onMutate: async ({ projectId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['phases', projectId] });
      const previousPhases = queryClient.getQueryData<ProjectPhase[]>(['phases', projectId]);
      
      const optimisticPhase: ProjectPhase = {
        id: 'temp-' + Date.now(),
        project_id: projectId,
        progress: 0,
        created_at: new Date().toISOString(),
        ...data,
      };

      queryClient.setQueryData<ProjectPhase[]>(['phases', projectId], (old = []) => 
        [...old, optimisticPhase]
      );

      return { previousPhases, projectId };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['phases', variables.projectId] });
      toast({
        title: "Phase created",
        description: "New phase has been created successfully.",
      });
    },
    onError: (error, variables, context) => {
      if (context?.previousPhases) {
        queryClient.setQueryData(['phases', context.projectId], context.previousPhases);
      }
      toast({
        title: "Error",
        description: "Failed to create phase. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdatePhase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UpdatePhaseData): Promise<ProjectPhase> => {
      const { data: phase, error } = await supabase
        .from('project_phases')
        .update(data)
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return { ...phase, status: phase.status as ProjectPhase['status'] };
    },
    onMutate: async (updatedPhase) => {
      const projectId = updatedPhase.project_id || 
        queryClient.getQueryData<ProjectPhase[]>(['phases', updatedPhase.project_id])
          ?.find(p => p.id === updatedPhase.id)?.project_id;
      
      if (!projectId) return;

      await queryClient.cancelQueries({ queryKey: ['phases', projectId] });
      const previousPhases = queryClient.getQueryData<ProjectPhase[]>(['phases', projectId]);

      queryClient.setQueryData<ProjectPhase[]>(['phases', projectId], (old = []) =>
        old.map(phase =>
          phase.id === updatedPhase.id
            ? { ...phase, ...updatedPhase }
            : phase
        )
      );

      return { previousPhases, projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['phases', data.project_id] });
      toast({
        title: "Phase updated",
        description: "Phase has been updated successfully.",
      });
    },
    onError: (error, variables, context) => {
      if (context?.previousPhases && context?.projectId) {
        queryClient.setQueryData(['phases', context.projectId], context.previousPhases);
      }
      toast({
        title: "Error",
        description: "Failed to update phase. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useDeletePhase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('project_phases')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async (deletedId) => {
      // Find which project this phase belongs to
      const allPhasesQueries = queryClient.getQueriesData({ queryKey: ['phases'] });
      let projectId: string | undefined;

      for (const [queryKey, queryData] of allPhasesQueries) {
        const phases = queryData as ProjectPhase[] | undefined;
        if (phases?.some(phase => phase.id === deletedId)) {
          projectId = (queryKey as string[])[1];
          break;
        }
      }

      if (!projectId) return;

      await queryClient.cancelQueries({ queryKey: ['phases', projectId] });
      const previousPhases = queryClient.getQueryData<ProjectPhase[]>(['phases', projectId]);

      queryClient.setQueryData<ProjectPhase[]>(['phases', projectId], (old = []) =>
        old.filter(phase => phase.id !== deletedId)
      );

      return { previousPhases, projectId };
    },
    onSuccess: (data, variables, context) => {
      if (context?.projectId) {
        queryClient.invalidateQueries({ queryKey: ['phases', context.projectId] });
      }
      toast({
        title: "Phase deleted",
        description: "Phase has been deleted successfully.",
      });
    },
    onError: (error, variables, context) => {
      if (context?.previousPhases && context?.projectId) {
        queryClient.setQueryData(['phases', context.projectId], context.previousPhases);
      }
      toast({
        title: "Error",
        description: "Failed to delete phase. Please try again.",
        variant: "destructive",
      });
    },
  });
}