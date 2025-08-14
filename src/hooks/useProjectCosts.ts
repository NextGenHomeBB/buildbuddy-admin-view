import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProjectCosts {
  project_id: string;
  project_name: string;
  budget: number | null;
  project_status: string;
  labor_cost: number;
  total_hours: number;
  material_cost: number;
  expense_cost: number;
  total_committed: number;
  variance: number | null;
  forecast: number;
  last_updated: string;
}

export function useProjectCosts(projectId: string) {
  const query = useQuery({
    queryKey: ['project-costs', projectId],
    queryFn: async (): Promise<ProjectCosts | null> => {
      // Use new enhanced secure RPC function for better financial data protection
      const { data, error } = await supabase.rpc('get_financial_summary_secure_enhanced', {
        p_project_id: projectId,
        p_summary_level: 'basic'
      });

      if (error) {
        console.error('Error fetching project costs:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return null;
      }

      // Transform the secure data to match ProjectCosts interface
      const projectData = data[0];
      return {
        project_id: projectData.project_id,
        project_name: projectData.project_name,
        budget: projectData.total_budget,
        project_status: 'active', // Default status
        labor_cost: 0, // Will be calculated separately if needed
        total_hours: 0, // Will be calculated separately if needed
        material_cost: 0, // Will be calculated separately if needed
        expense_cost: 0, // Will be calculated separately if needed
        total_committed: projectData.total_committed || 0,
        variance: projectData.total_variance,
        forecast: 0, // Will be calculated separately if needed
        last_updated: projectData.last_updated || new Date().toISOString()
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  // Set up real-time subscription for cost-related updates
  useEffect(() => {
    const channels = [
      supabase
        .channel('time_sheets_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'time_sheets', filter: `project_id=eq.${projectId}` }, 
          () => query.refetch()
        )
        .subscribe(),

      supabase
        .channel('worker_expenses_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'worker_expenses', filter: `project_id=eq.${projectId}` }, 
          () => query.refetch()
        )
        .subscribe(),

      supabase
        .channel('project_materials_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'project_materials', filter: `project_id=eq.${projectId}` }, 
          () => query.refetch()
        )
        .subscribe(),

      supabase
        .channel('worker_payments_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'worker_payments' }, 
          () => query.refetch()
        )
        .subscribe()
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [projectId, query.refetch]);

  return query;
}

export async function generateProjectCSV(
  projectId: string,
  exportType: 'summary' | 'detailed',
  startDate?: string,
  endDate?: string
) {
  const { data, error } = await supabase.functions.invoke('generate-project-csv', {
    body: {
      project_id: projectId,
      export_type: exportType,
      start_date: startDate,
      end_date: endDate,
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to generate CSV');
  }

  return data;
}