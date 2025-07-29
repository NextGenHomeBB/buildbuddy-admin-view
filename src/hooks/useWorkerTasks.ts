
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
  list_id?: string;
  assignee?: string;
  created_at: string;
  updated_at: string;
  project_name?: string;
  phase_name?: string;
  task_list?: {
    name: string;
    color_hex: string;
    owner_id: string;
  };
}

export function useWorkerTasks() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['worker-tasks', user?.id],
    queryFn: async (): Promise<WorkerTask[]> => {
      if (!user?.id) {
        console.log('useWorkerTasks: No user ID found');
        return [];
      }
      
      console.log('useWorkerTasks: Fetching tasks for user:', user.id);
      
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
          assignee,
          list_id,
          projects:project_id (
            name
          ),
          project_phases:phase_id (
            name
          ),
          task_lists:list_id (
            name,
            color_hex,
            owner_id
          )
        `)
        .eq('assignee', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('useWorkerTasks: Query error:', error);
        throw error;
      }
      
      console.log('useWorkerTasks: Raw query result:', { data, count: data?.length || 0 });
      
      const mappedTasks = (data || []).map(task => ({
        ...task,
        project_name: task.projects?.name,
        phase_name: task.project_phases?.name
      }));
      
      console.log('useWorkerTasks: Mapped tasks:', mappedTasks);
      
      return mappedTasks;
    },
    enabled: !!user?.id,
  });
}
