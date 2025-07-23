import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Assignment {
  id: string;
  user_id: string;
  project_id: string;
  role: string;
  assigned_by?: string;
  assigned_at?: string;
  full_name: string;
  avatar_url?: string;
  project_name: string;
}

export function useAssignments(projectId: string) {
  return useQuery({
    queryKey: ['assignments', projectId],
    queryFn: async (): Promise<Assignment[]> => {
      const { data, error } = await supabase
        .from('user_project_role')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          ),
          projects:project_id (
            name
          )
        `)
        .eq('project_id', projectId);

      if (error) throw error;
      
      // Transform the data to match our interface
      return (data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        project_id: item.project_id,
        role: item.role,
        assigned_by: item.assigned_by,
        assigned_at: item.assigned_at,
        full_name: item.profiles?.full_name || 'Unknown User',
        avatar_url: item.profiles?.avatar_url,
        project_name: item.projects?.name || 'Unknown Project'
      }));
    },
    enabled: !!projectId,
  });
}