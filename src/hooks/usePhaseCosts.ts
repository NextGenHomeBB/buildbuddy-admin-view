import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PhaseCostData {
  phase_id: string;
  phase_name: string;
  project_id: string;
  budget: number | null;
  material_cost: number;
  labor_cost_actual: number;
  labor_cost_planned: number;
  expense_cost: number;
  total_committed: number;
  variance: number | null;
  forecast: number;
  last_updated: string;
}

interface MaterialCost {
  id: string;
  phase_id: string;
  material_id?: string;
  material_name: string;
  material_sku?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

interface LaborCost {
  id: string;
  phase_id: string;
  worker_id: string;
  hours_planned: number;
  hours_actual: number;
  hourly_rate: number;
  total_planned_cost: number;
  total_actual_cost: number;
  work_date?: string;
  description?: string;
}

interface PhaseExpense {
  id: string;
  phase_id: string;
  expense_type: string;
  description: string;
  amount: number;
  expense_date: string;
  receipt_url?: string;
}

export function usePhaseCosts(phaseId: string) {
  return useQuery({
    queryKey: ['phase-costs', phaseId],
    queryFn: async (): Promise<PhaseCostData | null> => {
      // Use enhanced secure RPC function for better financial data protection
      const { data, error } = await supabase.rpc('get_phase_costs_secure_enhanced', {
        p_project_id: null, // Will be filtered by phase_id below
        p_phase_id: phaseId,
        p_include_detailed_breakdown: true
      });

      if (error) {
        console.error('Error fetching phase costs:', error);
        return null;
      }

      // Return the first (and should be only) result for the specific phase
      const phaseData = data?.[0];
      return phaseData || null;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function usePhaseMaterials(phaseId: string) {
  return useQuery({
    queryKey: ['phase-materials', phaseId],
    queryFn: async (): Promise<MaterialCost[]> => {
      const { data, error } = await supabase
        .from('phase_material_costs')
        .select('*')
        .eq('phase_id', phaseId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching phase materials:', error);
        throw error;
      }

      return data || [];
    },
  });
}

export function usePhaseLabor(phaseId: string) {
  return useQuery({
    queryKey: ['phase-labor', phaseId],
    queryFn: async (): Promise<LaborCost[]> => {
      const { data, error } = await supabase
        .from('phase_labor_costs')
        .select('*')
        .eq('phase_id', phaseId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching phase labor:', error);
        throw error;
      }

      return data || [];
    },
  });
}

export function usePhaseExpenses(phaseId: string) {
  return useQuery({
    queryKey: ['phase-expenses', phaseId],
    queryFn: async (): Promise<PhaseExpense[]> => {
      const { data, error } = await supabase
        .from('phase_expenses')
        .select('*')
        .eq('phase_id', phaseId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching phase expenses:', error);
        throw error;
      }

      return data || [];
    },
  });
}

export function useUpdatePhaseBudget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ phaseId, budget }: { phaseId: string; budget: number }) => {
      const { data, error } = await supabase
        .from('project_phases')
        .update({ budget })
        .eq('id', phaseId)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { phaseId }) => {
      queryClient.invalidateQueries({ queryKey: ['phase-costs', phaseId] });
      toast({
        title: "Budget Updated",
        description: "Phase budget has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update phase budget.",
        variant: "destructive",
      });
      console.error('Error updating phase budget:', error);
    },
  });
}

export function useAddMaterialCost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (materialData: Omit<MaterialCost, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('phase_material_costs')
        .insert([materialData])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { phase_id }) => {
      queryClient.invalidateQueries({ queryKey: ['phase-costs', phase_id] });
      queryClient.invalidateQueries({ queryKey: ['phase-materials', phase_id] });
      toast({
        title: "Material Cost Added",
        description: "Material cost has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add material cost.",
        variant: "destructive",
      });
      console.error('Error adding material cost:', error);
    },
  });
}

export function useAddLaborCost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (laborData: Omit<LaborCost, 'id'>) => {
      const { data, error } = await supabase
        .from('phase_labor_costs')
        .insert([laborData])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { phase_id }) => {
      queryClient.invalidateQueries({ queryKey: ['phase-costs', phase_id] });
      queryClient.invalidateQueries({ queryKey: ['phase-labor', phase_id] });
      toast({
        title: "Labor Cost Added",
        description: "Labor cost has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add labor cost.",
        variant: "destructive",
      });
      console.error('Error adding labor cost:', error);
    },
  });
}

export function useAddExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (expenseData: Omit<PhaseExpense, 'id'>) => {
      const { data, error } = await supabase
        .from('phase_expenses')
        .insert([expenseData])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { phase_id }) => {
      queryClient.invalidateQueries({ queryKey: ['phase-costs', phase_id] });
      queryClient.invalidateQueries({ queryKey: ['phase-expenses', phase_id] });
      toast({
        title: "Expense Added",
        description: "Expense has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add expense.",
        variant: "destructive",
      });
      console.error('Error adding expense:', error);
    },
  });
}