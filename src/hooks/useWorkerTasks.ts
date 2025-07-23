
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface WorkerTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  project_id: string;
  phase_id?: string;
  created_at: string;
  updated_at: string;
  project_name?: string;
  phase_name?: string;
}

export function useWorkerTasks() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['worker-tasks', user?.id],
    queryFn: async (): Promise<WorkerTask[]> => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          project_id,
          phase_id,
          created_at,
          updated_at,
          projects:project_id (
            name
          ),
          project_phases:phase_id (
            name
          )
        `)
        .eq('assignee', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(task => ({
        ...task,
        project_name: task.projects?.name,
        phase_name: task.project_phases?.name
      }));
    },
    enabled: !!user?.id,
  });
}
