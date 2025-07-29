import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface CalendarTask {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  start_date?: string;
  end_date?: string;
  duration_days?: number;
  is_scheduled: boolean;
  assignee?: string;
  project_id?: string;
  phase_id?: string;
  created_at: string;
  updated_at: string;
  project_name?: string;
  phase_name?: string;
  assignee_name?: string;
}

export function useCalendarTasks(startDate?: string, endDate?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['calendar-tasks', startDate, endDate],
    queryFn: async (): Promise<CalendarTask[]> => {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          projects:project_id (name),
          project_phases:phase_id (name),
          profiles:assignee (full_name)
        `)
        .eq('is_scheduled', true);

      if (startDate && endDate) {
        query = query
          .lte('start_date', endDate)      // Task starts before month ends
          .gte('end_date', startDate);     // Task ends after month starts
      }

      const { data, error } = await query
        .order('start_date', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status as 'todo' | 'in_progress' | 'done',
        priority: task.priority as 'low' | 'medium' | 'high',
        start_date: task.start_date,
        end_date: task.end_date,
        duration_days: task.duration_days,
        is_scheduled: task.is_scheduled,
        assignee: task.assignee,
        project_id: task.project_id,
        phase_id: task.phase_id,
        created_at: task.created_at,
        updated_at: task.updated_at,
        project_name: task.projects?.name,
        phase_name: task.project_phases?.name,
        assignee_name: task.profiles?.full_name
      }));
    },
    enabled: !!user,
  });
}

export function useWorkerCalendarTasks(startDate?: string, endDate?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['worker-calendar-tasks', user?.id, startDate, endDate],
    queryFn: async (): Promise<CalendarTask[]> => {
      if (!user?.id) {
        return [];
      }
      
      let query = supabase
        .from('tasks')
        .select(`
          *,
          projects:project_id (name),
          project_phases:phase_id (name),
          profiles:assignee (full_name)
        `)
        .eq('assignee', user.id)
        .eq('is_scheduled', true);

      if (startDate && endDate) {
        query = query
          .lte('start_date', endDate)      // Task starts before month ends
          .gte('end_date', startDate);     // Task ends after month starts
      }

      const { data, error } = await query
        .order('start_date', { ascending: true });

      if (error) throw error;
      
      
      
      return (data || []).map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status as 'todo' | 'in_progress' | 'done',
        priority: task.priority as 'low' | 'medium' | 'high',
        start_date: task.start_date,
        end_date: task.end_date,
        duration_days: task.duration_days,
        is_scheduled: task.is_scheduled,
        assignee: task.assignee,
        project_id: task.project_id,
        phase_id: task.phase_id,
        created_at: task.created_at,
        updated_at: task.updated_at,
        project_name: task.projects?.name,
        phase_name: task.project_phases?.name,
        assignee_name: task.profiles?.full_name
      }));
    },
    enabled: !!user?.id,
  });
}

export function useUpdateTaskSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      start_date,
      end_date,
      duration_days,
      is_scheduled = true
    }: {
      taskId: string;
      start_date?: string;
      end_date?: string;
      duration_days?: number;
      is_scheduled?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          start_date,
          end_date,
          duration_days,
          is_scheduled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['worker-calendar-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: "Task schedule updated",
        description: "The task has been successfully rescheduled.",
      });
    },
    onError: (error) => {
      // Error handling is done by react-query
      toast({
        title: "Error updating schedule",
        description: "Failed to update the task schedule. Please try again.",
        variant: "destructive",
      });
    },
  });
}