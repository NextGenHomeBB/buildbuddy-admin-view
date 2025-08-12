import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { QuotationTemplateLine } from './useQuotationTemplates';

export interface CreateQuotationTemplateLineData {
  template_id: string;
  material_sku?: string;
  material_name: string;
  material_description?: string;
  material_unit?: string;
  default_quantity: number;
  default_unit_price: number;
  is_optional?: boolean;
  category?: string;
}

export interface UpdateQuotationTemplateLineData {
  material_sku?: string;
  material_name?: string;
  material_description?: string;
  material_unit?: string;
  default_quantity?: number;
  default_unit_price?: number;
  sort_order?: number;
  is_optional?: boolean;
  category?: string;
}

// Fetch template line items
export function useQuotationTemplateLines(templateId: string) {
  return useQuery({
    queryKey: ['quotationTemplateLines', templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotation_template_lines')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order');

      if (error) throw error;
      return data as QuotationTemplateLine[];
    },
    enabled: !!templateId,
  });
}

// Create new template line item
export function useCreateQuotationTemplateLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lineData: CreateQuotationTemplateLineData) => {
      // Get the highest sort order for this template
      const { data: lastLine } = await supabase
        .from('quotation_template_lines')
        .select('sort_order')
        .eq('template_id', lineData.template_id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextSortOrder = lastLine ? lastLine.sort_order + 1 : 1;

      const { data, error } = await supabase
        .from('quotation_template_lines')
        .insert([{
          ...lineData,
          sort_order: nextSortOrder,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as QuotationTemplateLine;
    },
    onSuccess: (_, { template_id }) => {
      queryClient.invalidateQueries({ queryKey: ['quotationTemplateLines', template_id] });
      queryClient.invalidateQueries({ queryKey: ['quotationTemplate', template_id] });
      toast({
        title: "Line item added",
        description: "Template line item has been added successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error creating template line:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to add template line item',
        variant: "destructive",
      });
    },
  });
}

// Update template line item
export function useUpdateQuotationTemplateLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateQuotationTemplateLineData }) => {
      const { data, error } = await supabase
        .from('quotation_template_lines')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as QuotationTemplateLine;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotationTemplateLines', data.template_id] });
      queryClient.invalidateQueries({ queryKey: ['quotationTemplate', data.template_id] });
      toast({
        title: "Line item updated",
        description: "Template line item has been updated successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error updating template line:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to update template line item',
        variant: "destructive",
      });
    },
  });
}

// Delete template line item
export function useDeleteQuotationTemplateLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get template_id before deletion for cache invalidation
      const { data: lineItem } = await supabase
        .from('quotation_template_lines')
        .select('template_id')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('quotation_template_lines')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return lineItem?.template_id;
    },
    onSuccess: (templateId) => {
      if (templateId) {
        queryClient.invalidateQueries({ queryKey: ['quotationTemplateLines', templateId] });
        queryClient.invalidateQueries({ queryKey: ['quotationTemplate', templateId] });
      }
      toast({
        title: "Line item deleted",
        description: "Template line item has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error deleting template line:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to delete template line item',
        variant: "destructive",
      });
    },
  });
}

// Bulk update line items (for reordering)
export function useBulkUpdateQuotationTemplateLines() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, lines }: { templateId: string; lines: { id: string; sort_order: number }[] }) => {
      const promises = lines.map(line =>
        supabase
          .from('quotation_template_lines')
          .update({ sort_order: line.sort_order })
          .eq('id', line.id)
      );

      const results = await Promise.all(promises);
      
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error('Failed to update some line items');
      }

      return results;
    },
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ['quotationTemplateLines', templateId] });
      queryClient.invalidateQueries({ queryKey: ['quotationTemplate', templateId] });
    },
    onError: (error: any) => {
      console.error('Error bulk updating template lines:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to reorder template line items',
        variant: "destructive",
      });
    },
  });
}