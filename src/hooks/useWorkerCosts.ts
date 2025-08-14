import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface WorkerRate {
  id: string;
  worker_id: string;
  hourly_rate?: number;
  monthly_salary?: number;
  payment_type: 'hourly' | 'salary' | 'contract';
  effective_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

export interface WorkerPayment {
  id: string;
  worker_id: string;
  pay_period_start: string;
  pay_period_end: string;
  hours_worked?: number;
  overtime_hours?: number;
  regular_pay?: number;
  overtime_pay?: number;
  bonuses?: number;
  deductions?: number;
  gross_pay?: number;
  net_pay?: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  payment_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

export interface WorkerExpense {
  id: string;
  worker_id: string;
  project_id?: string;
  expense_type: string;
  description: string;
  amount: number;
  expense_date: string;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
  projects?: {
    name: string;
  };
}

// Hook for worker rates (secure version)
export function useWorkerRates(workerId?: string) {
  return useQuery({
    queryKey: ['worker-rates-secure', workerId],
    queryFn: async (): Promise<WorkerRate[]> => {
      const { data, error } = await supabase.rpc('get_worker_rates_secure', {
        p_worker_id: workerId || null,
        p_effective_date: null
      });

      if (error) {
        console.error('Error fetching secure worker rates:', error);
        throw error;
      }
      
      return (data || []) as unknown as WorkerRate[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true
  });
}

// Hook for worker payments
export function useWorkerPayments() {
  return useQuery({
    queryKey: ['worker-payments'],
    queryFn: async (): Promise<WorkerPayment[]> => {
      const { data, error } = await supabase
        .from('worker_payments')
        .select(`
          *,
          profiles!worker_id (
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching worker payments:', error);
        throw error;
      }
      
      return (data || []) as unknown as WorkerPayment[];
    },
  });
}

// Hook for worker expenses
export function useWorkerExpenses() {
  return useQuery({
    queryKey: ['worker-expenses'],
    queryFn: async (): Promise<WorkerExpense[]> => {
      const { data, error } = await supabase
        .from('worker_expenses')
        .select(`
          *,
          profiles!worker_id (
            full_name,
            avatar_url
          ),
          projects (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching worker expenses:', error);
        throw error;
      }
      
      return (data || []) as unknown as WorkerExpense[];
    },
  });
}

// Hook to create or update worker rate
export function useCreateWorkerRate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<WorkerRate, 'id' | 'created_at' | 'updated_at' | 'profiles'>) => {
      logger.debug('Creating worker rate with data:', data);
      
      try {
        const { data: result, error } = await supabase
          .from('worker_rates')
          .insert(data)
          .select()
          .single();

        logger.debug('Supabase response:', { result, error });

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        
        logger.debug('Worker rate created successfully:', result);
        return result;
      } catch (err) {
        console.error('Mutation function error:', err);
        throw err;
      }
    },
    onSuccess: (result) => {
      logger.debug('Mutation onSuccess called with:', result);
      queryClient.invalidateQueries({ queryKey: ['worker-rates'] });
      toast({
        title: "Success",
        description: "Worker rate created successfully",
      });
    },
    onError: (error) => {
      console.error('Mutation onError called with:', error);
      toast({
        title: "Error",
        description: `Failed to create worker rate: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}

// Hook to create worker payment
export function useCreateWorkerPayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<WorkerPayment, 'id' | 'created_at' | 'updated_at' | 'profiles'>) => {
      const { data: result, error } = await supabase
        .from('worker_payments')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-payments'] });
      toast({
        title: "Success",
        description: "Payment record created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create payment record",
        variant: "destructive",
      });
      console.error('Error creating payment:', error);
    },
  });
}

// Hook to update payment status
export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: WorkerPayment['status'] }) => {
      const { data: result, error } = await supabase
        .from('worker_payments')
        .update({ status, payment_date: status === 'paid' ? new Date().toISOString().split('T')[0] : null })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-payments'] });
      toast({
        title: "Success",
        description: "Payment status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
      console.error('Error updating payment status:', error);
    },
  });
}

// Hook to create worker expense
export function useCreateWorkerExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<WorkerExpense, 'id' | 'created_at' | 'updated_at' | 'profiles' | 'projects' | 'approved_by' | 'approved_at'>) => {
      const { data: result, error } = await supabase
        .from('worker_expenses')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-expenses'] });
      toast({
        title: "Success",
        description: "Expense claim created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create expense claim",
        variant: "destructive",
      });
      console.error('Error creating expense:', error);
    },
  });
}

// Hook to update expense status
export function useUpdateExpenseStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: WorkerExpense['status'] }) => {
      const { data: result, error } = await supabase
        .from('worker_expenses')
        .update({ 
          status, 
          approved_at: status === 'approved' ? new Date().toISOString() : null 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-expenses'] });
      toast({
        title: "Success",
        description: "Expense status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update expense status",
        variant: "destructive",
      });
      console.error('Error updating expense status:', error);
    },
  });
}

// Hook to delete worker rate
export function useDeleteWorkerRate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('worker_rates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-rates'] });
      toast({
        title: "Success",
        description: "Worker rate deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete worker rate",
        variant: "destructive",
      });
      console.error('Error deleting worker rate:', error);
    },
  });
}

// Hook to delete worker payment
export function useDeleteWorkerPayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('worker_payments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-payments'] });
      toast({
        title: "Success",
        description: "Payment record deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete payment record",
        variant: "destructive",
      });
      console.error('Error deleting payment:', error);
    },
  });
}