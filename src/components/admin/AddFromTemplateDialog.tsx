import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useDefaultPhaseTemplates, useCustomPhaseTemplates } from "@/hooks/useTemplates";
import { useAddTemplateItemsToPhase } from "@/hooks/useAddTemplateItemsToPhase";

interface AddFromTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddFromTemplateDialog({ open, onOpenChange }: AddFromTemplateDialogProps) {
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  
  const { data: phases, isLoading: phasesLoading } = useDefaultPhaseTemplates();
  const { data: templates, isLoading: templatesLoading } = useCustomPhaseTemplates();
  const addTemplateItemsToPhase = useAddTemplateItemsToPhase();

  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);
  const selectedPhase = phases?.find(p => p.id === selectedPhaseId);

  const handleAdd = async () => {
    if (!selectedPhaseId || !selectedTemplateId) return;
    
    try {
      await addTemplateItemsToPhase.mutateAsync({
        phaseId: selectedPhaseId,
        templateId: selectedTemplateId,
      });
      setSelectedPhaseId("");
      setSelectedTemplateId("");
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleClose = () => {
    setSelectedPhaseId("");
    setSelectedTemplateId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add From Template</DialogTitle>
          <DialogDescription>
            Select a default phase and a custom template to add the template's checklist items to the phase.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Phase Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Target Phase</label>
            <Select
              value={selectedPhaseId}
              onValueChange={setSelectedPhaseId}
              disabled={phasesLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={phasesLoading ? "Loading phases..." : "Choose a default phase"} />
              </SelectTrigger>
              <SelectContent>
                {phases?.map((phase) => (
                  <SelectItem key={phase.id} value={phase.id}>
                    <div className="flex items-center gap-2">
                      <span>{phase.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {phase.checklist_templates?.length || 0} items
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Source Template</label>
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
              disabled={templatesLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={templatesLoading ? "Loading templates..." : "Choose a custom template"} />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      <span>{template.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {template.checklist_templates?.length || 0} items
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview Section */}
          {selectedTemplate && selectedPhase && (
            <div className="space-y-4">
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">Preview: Items to be added</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Target Phase */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-medium text-muted-foreground">Target Phase</h5>
                          <Badge variant="secondary" className="text-xs">
                            {selectedPhase.checklist_templates?.length || 0} existing items
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">{selectedPhase.name}</p>
                        {selectedPhase.description && (
                          <p className="text-xs text-muted-foreground">{selectedPhase.description}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Source Template */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-medium text-muted-foreground">Source Template</h5>
                          <Badge variant="secondary" className="text-xs">
                            {selectedTemplate.checklist_templates?.length || 0} items to add
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">{selectedTemplate.name}</p>
                        {selectedTemplate.description && (
                          <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Items Preview */}
                {selectedTemplate.checklist_templates && selectedTemplate.checklist_templates.length > 0 && (
                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-muted-foreground mb-2">
                      Items that will be added:
                    </h5>
                    <ScrollArea className="h-32 rounded-md border bg-muted/30">
                      <div className="p-3 space-y-2">
                        {selectedTemplate.checklist_templates.map((item, index) => (
                          <div key={item.id} className="flex items-center gap-2 text-sm">
                            <div className="w-4 h-4 border border-border rounded-sm bg-background" />
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={addTemplateItemsToPhase.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={
              !selectedPhaseId || 
              !selectedTemplateId || 
              addTemplateItemsToPhase.isPending ||
              !selectedTemplate?.checklist_templates?.length
            }
          >
            {addTemplateItemsToPhase.isPending 
              ? 'Adding...' 
              : `Add ${selectedTemplate?.checklist_templates?.length || 0} Items`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}