import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  usePhaseTemplate,
  useUpdatePhaseTemplate,
  useCreateChecklistTemplate,
  useDeleteChecklistTemplate,
  ChecklistTemplate,
} from "@/hooks/useTemplates";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function PhaseTemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  
  const { data: template, isLoading } = usePhaseTemplate(id!);
  const updateTemplate = useUpdatePhaseTemplate();
  const createChecklistItem = useCreateChecklistTemplate();
  const deleteChecklistItem = useDeleteChecklistTemplate();

  // Update local state when template data is loaded
  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || "");
    }
  }, [template]);

  const handleUpdateTemplate = async () => {
    if (!template) return;
    
    await updateTemplate.mutateAsync({
      id: template.id,
      data: { name, description }
    });
  };

  const handleAddChecklistItem = async () => {
    if (!template || !newChecklistItem.trim()) return;

    const maxSortOrder = Math.max(
      ...(template.checklist_templates?.map(item => item.sort_order) || [0])
    );

    await createChecklistItem.mutateAsync({
      phase_template_id: template.id,
      label: newChecklistItem.trim(),
      sort_order: maxSortOrder + 1,
    });

    setNewChecklistItem("");
  };

  const handleDeleteChecklistItem = (checklistId: string) => {
    deleteChecklistItem.mutate(checklistId);
  };

  if (isLoading) {
    return <div>Loading template...</div>;
  }

  if (!template) {
    return <div>Template not found</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/templates/phases")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Templates
        </Button>
        <h1 className="text-2xl font-bold">Edit Template</h1>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Template name"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Template description (optional)"
              />
            </div>
            <Button onClick={handleUpdateTemplate}>Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checklist Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="Add new checklist item"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddChecklistItem();
                    }
                  }}
                />
                <Button onClick={handleAddChecklistItem} disabled={!newChecklistItem.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {template.checklist_templates?.map((item: ChecklistTemplate, index) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {index + 1}.
                      </span>
                      {item.label}
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Checklist Item</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this checklist item?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteChecklistItem(item.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>

              {(!template.checklist_templates || template.checklist_templates.length === 0) && (
                <p className="text-muted-foreground text-center py-8">
                  No checklist items yet. Add one above to get started.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}