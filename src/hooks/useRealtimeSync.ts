import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    logger.info('Setting up realtime subscriptions');

    // Subscribe to task changes
    const tasksChannel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        (payload) => {
          logger.debug('Task changed:', payload);
          
          // Invalidate all task-related queries
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['list-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['unassigned-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['worker-tasks'] });
        }
      )
      .subscribe();

    // Subscribe to task list changes
    const taskListsChannel = supabase
      .channel('task-lists-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_lists'
        },
        (payload) => {
          logger.debug('Task list changed:', payload);
          
          // Invalidate task list queries
          queryClient.invalidateQueries({ queryKey: ['task-lists'] });
        }
      )
      .subscribe();

    // Subscribe to project changes
    const projectsChannel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        (payload) => {
          logger.debug('Project changed:', payload);
          
          // Invalidate project queries
          queryClient.invalidateQueries({ queryKey: ['projects'] });
        }
      )
      .subscribe();

    // Subscribe to worker/profile changes
    const profilesChannel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          logger.debug('Profile changed:', payload);
          
          // Invalidate worker queries
          queryClient.invalidateQueries({ queryKey: ['workers'] });
        }
      )
      .subscribe();

    return () => {
      logger.info('Cleaning up realtime subscriptions');
      
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(taskListsChannel);
      supabase.removeChannel(projectsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [queryClient]);
}