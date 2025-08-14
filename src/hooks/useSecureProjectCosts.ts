import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface SecureProjectCost {
  project_id: string;
  project_name: string;
  total_labor_cost?: number;
  total_material_cost?: number;
  total_expense_cost?: number;
  total_cost?: number;
  budget?: number;
  budget_variance?: number;
}

export function useSecureProjectCosts(projectId?: string) {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['secure-project-costs', projectId],
    queryFn: async (): Promise<SecureProjectCost[]> => {
      try {
        const { data, error } = await supabase.rpc('get_project_costs_secure', {
          p_project_id: projectId || null
        });

        if (error) {
          logger.error('Error fetching secure project costs:', error);
          
          // Handle rate limit errors specifically
          if (error.message.includes('Rate limit exceeded')) {
            toast({
              title: "Access Limited",
              description: "Too many requests for financial data. Please try again later.",
              variant: "destructive",
            });
          } else if (error.message.includes('Access denied')) {
            toast({
              title: "Access Denied",
              description: "You don't have permission to view this project's financial data.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Access Error",
              description: "Unable to access project cost information.",
              variant: "destructive",
            });
          }
          
          throw error;
        }

        return data || [];
      } catch (err) {
        logger.error('Failed to fetch secure project costs:', err);
        throw err;
      }
    },
    retry: (failureCount, error: any) => {
      // Don't retry rate limit or access denied errors
      if (error?.message?.includes('Rate limit exceeded') || 
          error?.message?.includes('Access denied')) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}