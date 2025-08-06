import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";

interface AddTemplateItemsToPhaseParams {
  phaseId: string;
  templateId: string;
}

export function useAddTemplateItemsToPhase() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ phaseId, templateId }: AddTemplateItemsToPhaseParams) => {
      try {
        // First, get the checklist items from the template
        const { data: templateItems, error: fetchError } = await supabase
          .from("checklist_templates")
          .select("label, sort_order")
          .eq("phase_template_id", templateId)
          .order("sort_order");

        if (fetchError) {
          logger.error("Error fetching template items:", fetchError);
          throw fetchError;
        }

        if (!templateItems || templateItems.length === 0) {
          throw new Error("No items found in the selected template");
        }

        // Get the current max sort_order for the target phase
        const { data: existingItems, error: sortError } = await supabase
          .from("checklist_templates")
          .select("sort_order")
          .eq("phase_template_id", phaseId)
          .order("sort_order", { ascending: false })
          .limit(1);

        if (sortError) {
          logger.error("Error fetching existing items:", sortError);
          throw sortError;
        }

        const maxSortOrder = existingItems && existingItems.length > 0 
          ? existingItems[0].sort_order 
          : 0;

        // Prepare new items with adjusted sort_order
        const newItems = templateItems.map((item, index) => ({
          phase_template_id: phaseId,
          label: item.label,
          sort_order: maxSortOrder + index + 1,
        }));

        // Insert the new items
        const { error: insertError } = await supabase
          .from("checklist_templates")
          .insert(newItems);

        if (insertError) {
          logger.error("Error inserting template items:", insertError);
          throw insertError;
        }

        return { success: true, itemsAdded: newItems.length };
      } catch (error) {
        logger.error("Error in addTemplateItemsToPhase:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["phase-templates"] });
      queryClient.invalidateQueries({ queryKey: ["default-phase-templates"] });
      toast({
        title: "Success",
        description: `Added ${data.itemsAdded} items from template to phase`,
      });
    },
    onError: (error: any) => {
      logger.error("Error adding template items to phase:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add template items to phase",
        variant: "destructive",
      });
    },
  });
}