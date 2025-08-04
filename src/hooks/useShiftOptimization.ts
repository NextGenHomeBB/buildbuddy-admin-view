import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ShiftProposal {
  task_id: string;
  worker_id: string;
  project_id: string;
  start_time: string;
  end_time: string;
  confidence_score: number;
  task?: {
    title: string;
    project?: {
      name: string;
    };
  };
  worker?: {
    full_name: string;
  };
}

export interface Shift {
  id: string;
  task_id: string;
  worker_id: string;
  project_id: string;
  start_time: string;
  end_time: string;
  status: 'proposed' | 'confirmed' | 'rejected' | 'completed';
  confidence_score: number;
  created_at: string;
  updated_at: string;
  notes?: string;
  task?: {
    title: string;
    project?: {
      name: string;
    };
  };
  worker?: {
    full_name: string;
  };
}

export function useOptimizeShifts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, autoConfirm = false }: { date: string; autoConfirm?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('shift-optimize', {
        body: { date, auto_confirm: autoConfirm }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['optimization-runs'] });
      
      toast({
        title: "Optimization Complete",
        description: `Generated ${data.total_count} shift proposals with ${data.auto_confirmed ? 'auto-confirmation' : 'manual review required'}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Optimization Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useShifts(date?: string, status?: string) {
  return useQuery({
    queryKey: ['shifts', date, status],
    queryFn: async () => {
      let query = supabase
        .from('shifts')
        .select(`
          *,
          task:tasks!fk_shifts_task_id(title, project:projects(name)),
          worker:profiles!fk_shifts_worker_id(full_name)
        `)
        .order('start_time', { ascending: true });

      if (date) {
        query = query.gte('start_time', `${date}T00:00:00Z`)
                  .lt('start_time', `${date}T23:59:59Z`);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useBulkUpdateShifts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { id: string; status: string; notes?: string }[]) => {
      // Update each shift individually
      const promises = updates.map(update => 
        supabase
          .from('shifts')
          .update({
            status: update.status,
            notes: update.notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id)
      );

      const results = await Promise.all(promises);
      const errors = results.filter(result => result.error);
      
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} shifts`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast({
        title: "Shifts Updated",
        description: "Shift statuses have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useOptimizationRuns() {
  return useQuery({
    queryKey: ['optimization-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('optimization_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });
}