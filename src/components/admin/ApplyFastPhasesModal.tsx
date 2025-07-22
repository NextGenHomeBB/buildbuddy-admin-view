import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { usePhaseTemplates, useApplyFastPhases } from "@/hooks/useTemplates";

interface ApplyFastPhasesModalProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApplyFastPhasesModal({
  projectId,
  open,
  onOpenChange,
}: ApplyFastPhasesModalProps) {
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  const { data: templates, isLoading } = usePhaseTemplates();
  const applyFastPhases = useApplyFastPhases();

  const handleToggleTemplate = (templateId: string) => {
    setSelectedTemplates((prev) =>
      prev.includes(templateId)
        ? prev.filter((id) => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleApplyPhases = async () => {
    if (selectedTemplates.length === 0) return;

    setIsApplying(true);
    try {
      await applyFastPhases.mutateAsync({
        projectId,
        templateIds: selectedTemplates,
      });
      setSelectedTemplates([]);
      onOpenChange(false);
    } finally {
      setIsApplying(false);
    }
  };

  const totalCheclistItems = selectedTemplates.reduce((total, templateId) => {
    const template = templates?.find((t) => t.id === templateId);
    return total + (template?.checklist_templates?.length || 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Apply Fast Phases</DialogTitle>
          <DialogDescription>
            Select phase templates to add to your project. Each phase will include
            its predefined tasks and checklist items.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div>Loading templates...</div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {templates?.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={template.id}
                      checked={selectedTemplates.includes(template.id)}
                      onCheckedChange={() => handleToggleTemplate(template.id)}
                    />
                    <div>
                      <label
                        htmlFor={template.id}
                        className="font-medium cursor-pointer"
                      >
                        {template.name}
                      </label>
                      {template.description && (
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {template.checklist_templates?.length || 0} items
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {selectedTemplates.length > 0 && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>
                  Selected: {selectedTemplates.length} phases with{" "}
                  {totalCheclistItems} total tasks
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApplyPhases}
            disabled={selectedTemplates.length === 0 || isApplying}
          >
            {isApplying ? "Applying..." : "Apply Selected Phases"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}