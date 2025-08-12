import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface QuotationTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  default_tax_rate: number;
  default_terms_conditions?: string;
  default_notes?: string;
  default_valid_days: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  org_id?: string;
}

export interface QuotationTemplateWithLines extends QuotationTemplate {
  quotation_template_lines: QuotationTemplateLine[];
}

export interface QuotationTemplateLine {
  id: string;
  template_id: string;
  material_sku?: string;
  material_name: string;
  material_description?: string;
  material_unit: string;
  default_quantity: number;
  default_unit_price: number;
  sort_order: number;
  is_optional: boolean;
  category?: string;
}

export interface CreateQuotationTemplateData {
  name: string;
  description?: string;
  category?: string;
  default_tax_rate?: number;
  default_terms_conditions?: string;
  default_notes?: string;
  default_valid_days?: number;
  is_active?: boolean;
}

export interface UpdateQuotationTemplateData {
  name?: string;
  description?: string;
  category?: string;
  default_tax_rate?: number;
  default_terms_conditions?: string;
  default_notes?: string;
  default_valid_days?: number;
  is_active?: boolean;
}

// Fetch all quotation templates
export function useQuotationTemplates() {
  return useQuery({
    queryKey: ['quotationTemplates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotation_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as QuotationTemplate[];
    },
  });
}

// Fetch single quotation template with line items
export function useQuotationTemplate(id: string) {
  return useQuery({
    queryKey: ['quotationTemplate', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotation_templates')
        .select(`
          *,
          quotation_template_lines (*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as QuotationTemplateWithLines | null;
    },
    enabled: !!id,
  });
}

// Fetch templates by category
export function useQuotationTemplatesByCategory(category?: string) {
  return useQuery({
    queryKey: ['quotationTemplates', 'category', category],
    queryFn: async () => {
      let query = supabase
        .from('quotation_templates')
        .select('*')
        .eq('is_active', true);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      return data as QuotationTemplate[];
    },
  });
}

// Get unique categories
export function useQuotationTemplateCategories() {
  return useQuery({
    queryKey: ['quotationTemplateCategories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotation_templates')
        .select('category')
        .not('category', 'is', null)
        .eq('is_active', true);

      if (error) throw error;
      
      const categories = Array.from(new Set(data.map(item => item.category).filter(Boolean)));
      return categories as string[];
    },
  });
}

// Create new quotation template
export function useCreateQuotationTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateData: CreateQuotationTemplateData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('quotation_templates')
        .insert([{
          ...templateData,
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as QuotationTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotationTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['quotationTemplateCategories'] });
      toast({
        title: "Template created",
        description: "Quotation template has been created successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error creating template:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to create quotation template',
        variant: "destructive",
      });
    },
  });
}

// Update quotation template
export function useUpdateQuotationTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateQuotationTemplateData }) => {
      const { data, error } = await supabase
        .from('quotation_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as QuotationTemplate;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['quotationTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['quotationTemplate', id] });
      queryClient.invalidateQueries({ queryKey: ['quotationTemplateCategories'] });
      toast({
        title: "Template updated",
        description: "Quotation template has been updated successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error updating template:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to update quotation template',
        variant: "destructive",
      });
    },
  });
}

// Delete quotation template
export function useDeleteQuotationTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quotation_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotationTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['quotationTemplateCategories'] });
      toast({
        title: "Template deleted",
        description: "Quotation template has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to delete quotation template',
        variant: "destructive",
      });
    },
  });
}

// Duplicate quotation template
export function useDuplicateQuotationTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Fetch original template with line items
      const { data: original, error: fetchError } = await supabase
        .from('quotation_templates')
        .select(`
          *,
          quotation_template_lines (*)
        `)
        .eq('id', templateId)
        .single();

      if (fetchError) throw fetchError;

      // Create new template
      const { data: newTemplate, error: templateError } = await supabase
        .from('quotation_templates')
        .insert([{
          name: `${original.name} (Copy)`,
          description: original.description,
          category: original.category,
          default_tax_rate: original.default_tax_rate,
          default_terms_conditions: original.default_terms_conditions,
          default_notes: original.default_notes,
          default_valid_days: original.default_valid_days,
          created_by: user.id,
        }])
        .select()
        .single();

      if (templateError) throw templateError;

      // Copy line items if any exist
      if (original.quotation_template_lines && original.quotation_template_lines.length > 0) {
        const lineItemsData = original.quotation_template_lines.map((item: any) => ({
          template_id: newTemplate.id,
          material_sku: item.material_sku,
          material_name: item.material_name,
          material_description: item.material_description,
          material_unit: item.material_unit,
          default_quantity: item.default_quantity,
          default_unit_price: item.default_unit_price,
          sort_order: item.sort_order,
          is_optional: item.is_optional,
          category: item.category,
        }));

        const { error: lineItemsError } = await supabase
          .from('quotation_template_lines')
          .insert(lineItemsData);

        if (lineItemsError) throw lineItemsError;
      }

      return newTemplate as QuotationTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotationTemplates'] });
      toast({
        title: "Template duplicated",
        description: "Quotation template has been duplicated successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error duplicating template:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to duplicate quotation template',
        variant: "destructive",
      });
    },
  });
}