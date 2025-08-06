import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useDefaultPhaseTemplates } from "@/hooks/useTemplates";
import { useCopyPhaseTemplate } from "@/hooks/useCopyPhaseTemplate";
import { Skeleton } from "@/components/ui/skeleton";

interface AddFromDefaultPhasesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddFromDefaultPhasesDialog({ open, onOpenChange }: AddFromDefaultPhasesDialogProps) {
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const { data: defaultTemplates, isLoading } = useDefaultPhaseTemplates();
  const copyPhaseTemplate = useCopyPhaseTemplate();

  const handleSelectTemplate = (templateId: string, checked: boolean) => {
    const newSelected = new Set(selectedTemplates);
    if (checked) {
      newSelected.add(templateId);
    } else {
      newSelected.delete(templateId);
    }
    setSelectedTemplates(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && defaultTemplates) {
      setSelectedTemplates(new Set(defaultTemplates.map(t => t.id)));
    } else {
      setSelectedTemplates(new Set());
    }
  };

  const handleCopy = async () => {
    if (selectedTemplates.size === 0) return;
    
    try {
      await copyPhaseTemplate.mutateAsync(Array.from(selectedTemplates));
      setSelectedTemplates(new Set());
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const isAllSelected = defaultTemplates ? selectedTemplates.size === defaultTemplates.length : false;
  const isIndeterminate = selectedTemplates.size > 0 && selectedTemplates.size < (defaultTemplates?.length || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add from Default Phases</DialogTitle>
          <DialogDescription>
            Select default phase templates to copy as custom templates. You can then modify them to suit your needs.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all"
              checked={isAllSelected}
              ref={(el) => {
                if (el) (el as any).indeterminate = isIndeterminate;
              }}
              onCheckedChange={handleSelectAll}
              disabled={isLoading || !defaultTemplates?.length}
            />
            <label htmlFor="select-all" className="text-sm font-medium">
              Select all ({defaultTemplates?.length || 0} templates)
            </label>
          </div>
          
          <ScrollArea className="h-[400px] rounded-md border">
            <div className="space-y-2 p-4">
              {isLoading ? (
                Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-4" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))
              ) : defaultTemplates?.map((template) => (
                <div key={template.id} className="flex items-start space-x-2 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <Checkbox
                    id={template.id}
                    checked={selectedTemplates.has(template.id)}
                    onCheckedChange={(checked) => handleSelectTemplate(template.id, checked as boolean)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={template.id}
                        className="text-sm font-medium cursor-pointer hover:underline"
                      >
                        {template.name}
                      </label>
                      <Badge variant="secondary" className="text-xs">
                        {template.checklist_templates?.length || 0} items
                      </Badge>
                    </div>
                    {template.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={copyPhaseTemplate.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCopy}
            disabled={selectedTemplates.size === 0 || copyPhaseTemplate.isPending}
          >
            {copyPhaseTemplate.isPending ? 'Copying...' : `Copy ${selectedTemplates.size} Template${selectedTemplates.size !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}