import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimeWorkerAssignments() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('worker-assignments-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'user_project_role'
        },
        (payload) => {
          console.log('Worker assignment change detected:', payload);
          
          // Invalidate all worker-related queries when assignments change
          queryClient.invalidateQueries({ queryKey: ['workers-with-project-access'] });
          queryClient.invalidateQueries({ queryKey: ['workers'] });
          queryClient.invalidateQueries({ queryKey: ['projects'] });
          
          // If we have project_id in the payload, invalidate specific project queries
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          if (newRecord?.project_id || oldRecord?.project_id) {
            const projectId = newRecord?.project_id || oldRecord?.project_id;
            queryClient.invalidateQueries({ queryKey: ['project-workers', projectId] });
            queryClient.invalidateQueries({ queryKey: ['project', projectId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}