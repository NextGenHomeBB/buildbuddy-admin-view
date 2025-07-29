import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  project_id: string;
  phase_id?: string;
  assignee?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

interface UseOptimizedTasksOptions {
  projectId?: string;
  status?: string;
  assigneeId?: string;
  phaseId?: string;
}

export function useOptimizedTasks(options: UseOptimizedTasksOptions = {}) {
  const { projectId, status, assigneeId, phaseId } = options;

  const queryKey = useMemo(() => 
    ['tasks', { projectId, status, assigneeId, phaseId }].filter(Boolean),
    [projectId, status, assigneeId, phaseId]
  );

  const queryFn = useCallback(async (): Promise<Task[]> => {
    let query = supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        project_id,
        phase_id,
        assignee,
        start_date,
        end_date,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (assigneeId) {
      query = query.eq('assignee', assigneeId);
    }
    
    if (phaseId) {
      query = query.eq('phase_id', phaseId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }, [projectId, status, assigneeId, phaseId]);

  const query = useQuery({
    queryKey,
    queryFn,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  // Memoized computed values
  const tasksByStatus = useMemo(() => {
    if (!query.data) return {};
    
    return query.data.reduce((acc, task) => {
      if (!acc[task.status]) {
        acc[task.status] = [];
      }
      acc[task.status].push(task);
      return acc;
    }, {} as Record<string, Task[]>);
  }, [query.data]);

  const tasksByPriority = useMemo(() => {
    if (!query.data) return {};
    
    return query.data.reduce((acc, task) => {
      if (!acc[task.priority]) {
        acc[task.priority] = [];
      }
      acc[task.priority].push(task);
      return acc;
    }, {} as Record<string, Task[]>);
  }, [query.data]);

  const completedTasksCount = useMemo(() => 
    query.data?.filter(task => task.status === 'done').length || 0,
    [query.data]
  );

  const inProgressTasksCount = useMemo(() => 
    query.data?.filter(task => task.status === 'in_progress').length || 0,
    [query.data]
  );

  return {
    ...query,
    tasksByStatus,
    tasksByPriority,
    completedTasksCount,
    inProgressTasksCount,
  };
}