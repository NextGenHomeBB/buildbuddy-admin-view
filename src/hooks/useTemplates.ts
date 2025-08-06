import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";

export interface PhaseTemplate {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  template_type: 'default' | 'custom';
  created_by?: string;
  created_at: string;
}

export interface ChecklistTemplate {
  id: string;
  phase_template_id?: string;
  label: string;
  sort_order: number;
  created_at?: string;
}

export interface PhaseTemplateWithChecklists extends PhaseTemplate {
  checklist_templates: ChecklistTemplate[];
}

export interface CreatePhaseTemplateData {
  name: string;
  description?: string;
  sort_order: number;
}

export interface UpdatePhaseTemplateData {
  name?: string;
  description?: string;
  sort_order?: number;
}

export interface CreateChecklistTemplateData {
  phase_template_id: string;
  label: string;
  sort_order: number;
}

// Fetch all phase templates
export function usePhaseTemplates() {
  return useQuery({
    queryKey: ["phase-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("phase_templates")
        .select(`
          *,
          checklist_templates(
            id,
            label,
            sort_order,
            created_at
          )
        `)
        .order("sort_order");

      if (error) throw error;
      return data as PhaseTemplateWithChecklists[];
    },
  });
}

// Hook to fetch only default phase templates
export function useDefaultPhaseTemplates() {
  return useQuery({
    queryKey: ['defaultPhaseTemplates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phase_templates')
        .select(`
          *,
          checklist_templates (
            id,
            label,
            sort_order
          )
        `)
        .eq('template_type', 'default')
        .order('sort_order');

      if (error) throw error;
      return data as PhaseTemplateWithChecklists[];
    },
  });
}

// Hook to fetch only custom phase templates
export function useCustomPhaseTemplates() {
  return useQuery({
    queryKey: ['customPhaseTemplates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phase_templates')
        .select(`
          *,
          checklist_templates (
            id,
            label,
            sort_order
          )
        `)
        .eq('template_type', 'custom')
        .order('sort_order');

      if (error) throw error;
      return data as PhaseTemplateWithChecklists[];
    },
  });
}

// Fetch single phase template with checklists
export function usePhaseTemplate(id: string) {
  return useQuery({
    queryKey: ["phase-template", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("phase_templates")
        .select(`
          *,
          checklist_templates(
            id,
            label,
            sort_order,
            created_at
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as PhaseTemplateWithChecklists;
    },
    enabled: !!id,
  });
}

// Create phase template
export function useCreatePhaseTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreatePhaseTemplateData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: result, error } = await supabase
        .from("phase_templates")
        .insert({
          ...data,
          template_type: 'custom',
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phase-templates"] });
      queryClient.invalidateQueries({ queryKey: ["customPhaseTemplates"] });
      toast({
        title: "Template created",
        description: "Phase template has been created successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Error creating phase template:", error);
      
      let errorMessage = "Failed to create phase template.";
      
      // Provide specific error messages for common issues
      if (error?.message?.includes("row-level security")) {
        errorMessage = "You don't have permission to create templates. Please contact an administrator.";
      } else if (error?.message?.includes("JWT")) {
        errorMessage = "Please log in to create templates.";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
}

// Update phase template
export function useUpdatePhaseTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePhaseTemplateData }) => {
      const { data: result, error } = await supabase
        .from("phase_templates")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phase-templates"] });
      queryClient.invalidateQueries({ queryKey: ["phase-template"] });
      toast({
        title: "Template updated",
        description: "Phase template has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update phase template.",
        variant: "destructive",
      });
      console.error("Error updating phase template:", error);
    },
  });
}

// Delete phase template
export function useDeletePhaseTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("phase_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phase-templates"] });
      toast({
        title: "Template deleted",
        description: "Phase template has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete phase template.",
        variant: "destructive",
      });
      console.error("Error deleting phase template:", error);
    },
  });
}

// Create checklist template
export function useCreateChecklistTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateChecklistTemplateData) => {
      const { data: result, error } = await supabase
        .from("checklist_templates")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phase-template"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create checklist item.",
        variant: "destructive",
      });
      console.error("Error creating checklist template:", error);
    },
  });
}

// Delete checklist template
export function useDeleteChecklistTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("checklist_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phase-template"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete checklist item.",
        variant: "destructive",
      });
      console.error("Error deleting checklist template:", error);
    },
  });
}

// Apply fast phases to project
export function useApplyFastPhases() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, templateIds }: { projectId: string; templateIds: string[] }) => {
      const { data, error } = await supabase.functions.invoke('apply_fast_phases', {
        body: {
          project_id: projectId,
          template_ids: templateIds
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate all phases queries and the specific project's phases
      queryClient.invalidateQueries({ queryKey: ["phases"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Fast Phases Applied",
        description: `${data.phases} phases and ${data.tasks} tasks added successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to apply fast phases to project.",
        variant: "destructive",
      });
      console.error("Error applying fast phases:", error);
    },
  });
}