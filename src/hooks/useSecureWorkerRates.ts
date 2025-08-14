import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface SecureWorkerRate {
  id: string;
  worker_id: string;
  hourly_rate?: number;
  monthly_salary?: number;
  payment_type: string;
  effective_date: string;
  end_date?: string;
  worker_name: string;
}

export function useSecureWorkerRates(workerId?: string) {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['secure-worker-rates', workerId],
    queryFn: async (): Promise<SecureWorkerRate[]> => {
      try {
        const { data, error } = await supabase.rpc('get_worker_rates_masked', {
          p_worker_id: workerId || null
        });

        if (error) {
          logger.error('Error fetching secure worker rates:', error);
          
          // Handle rate limit errors specifically
          if (error.message.includes('Rate limit exceeded')) {
            toast({
              title: "Access Limited",
              description: "Too many requests. Please try again later.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Access Error",
              description: "Unable to access salary information.",
              variant: "destructive",
            });
          }
          
          throw error;
        }

        return data || [];
      } catch (err) {
        logger.error('Failed to fetch secure worker rates:', err);
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
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}