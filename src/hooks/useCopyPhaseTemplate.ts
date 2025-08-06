import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useCopyPhaseTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateIds: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const results = [];
      
      for (const templateId of templateIds) {
        // Get the original template with its checklist items
        const { data: originalTemplate, error: fetchError } = await supabase
          .from('phase_templates')
          .select(`
            *,
            checklist_templates (*)
          `)
          .eq('id', templateId)
          .single();

        if (fetchError) throw fetchError;

        // Get the highest sort order for custom templates
        const { data: lastCustomTemplate } = await supabase
          .from('phase_templates')
          .select('sort_order')
          .eq('template_type', 'custom')
          .order('sort_order', { ascending: false })
          .limit(1);

        const nextSortOrder = lastCustomTemplate?.[0]?.sort_order ? lastCustomTemplate[0].sort_order + 1 : 1;

        // Create the new custom template
        const { data: newTemplate, error: insertError } = await supabase
          .from('phase_templates')
          .insert([{
            name: `${originalTemplate.name} (Copy)`,
            description: originalTemplate.description,
            sort_order: nextSortOrder,
            template_type: 'custom',
            created_by: user.id
          }])
          .select()
          .single();

        if (insertError) throw insertError;

        // Copy checklist templates
        if (originalTemplate.checklist_templates && originalTemplate.checklist_templates.length > 0) {
          const checklistData = originalTemplate.checklist_templates.map((item: any) => ({
            phase_template_id: newTemplate.id,
            label: item.label,
            sort_order: item.sort_order
          }));

          const { error: checklistError } = await supabase
            .from('checklist_templates')
            .insert(checklistData);

          if (checklistError) throw checklistError;
        }

        results.push(newTemplate);
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['customPhaseTemplates'] });
      toast.success(`Successfully copied ${results.length} template${results.length > 1 ? 's' : ''} to custom templates`);
    },
    onError: (error: any) => {
      console.error('Error copying templates:', error);
      toast.error(error.message || 'Failed to copy templates');
    },
  });
}