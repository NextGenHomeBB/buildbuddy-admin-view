import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomPhaseTemplates, useDeletePhaseTemplate } from "@/hooks/useTemplates";
import { AddFromDefaultPhasesDialog } from "./AddFromDefaultPhasesDialog";

interface CustomTemplatesTabProps {
  onCreateTemplate: () => void;
}

export function CustomTemplatesTab({ onCreateTemplate }: CustomTemplatesTabProps) {
  const navigate = useNavigate();
  const { data: customTemplates, isLoading } = useCustomPhaseTemplates();
  const deletePhaseTemplate = useDeletePhaseTemplate();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showAddFromDefaultDialog, setShowAddFromDefaultDialog] = useState(false);

  const toggleRow = (phaseId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedRows(newExpanded);
  };

  const handleEdit = (phaseId: string) => {
    navigate(`/admin/phase-templates/${phaseId}`);
  };

  const handleDelete = (phaseId: string, phaseName: string) => {
    if (confirm(`Are you sure you want to delete the "${phaseName}" template? This action cannot be undone.`)) {
      deletePhaseTemplate.mutate(phaseId);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Custom Templates</CardTitle>
          <CardDescription>
            Create and manage your custom checklist templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!customTemplates || customTemplates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Custom Templates</CardTitle>
          <CardDescription>
            Create and manage your custom checklist templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No custom templates yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Start by creating your first custom checklist template or add templates from our default phases.
            </p>
            <div className="flex gap-2">
              <Button onClick={onCreateTemplate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Custom Template
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAddFromDefaultDialog(true)}
              >
                <Download className="h-4 w-4 mr-2" />
                Add from Default Phases
              </Button>
            </div>
          </div>
          <AddFromDefaultPhasesDialog 
            open={showAddFromDefaultDialog}
            onOpenChange={setShowAddFromDefaultDialog}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Custom Templates</CardTitle>
            <CardDescription>
              Create and manage your custom checklist templates
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAddFromDefaultDialog(true)}>
              <Download className="h-4 w-4 mr-2" />
              Add from Default Phases
            </Button>
            <Button onClick={onCreateTemplate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template Name</TableHead>
              <TableHead>Checklist Items</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customTemplates.map((phase) => (
              <>
                <TableRow 
                  key={phase.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleRow(phase.id)}
                >
                  <TableCell className="font-medium">{phase.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {phase.checklist_templates?.length || 0} items
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {phase.description || "No description"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(phase.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(phase.id, phase.name)}
                        disabled={deletePhaseTemplate.isPending}
                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {expandedRows.has(phase.id) && phase.checklist_templates && phase.checklist_templates.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="bg-muted/30">
                      <div className="py-2">
                        <p className="text-sm font-medium mb-2">Checklist Items:</p>
                        <div className="space-y-1">
                          {phase.checklist_templates
                            .sort((a, b) => a.sort_order - b.sort_order)
                            .map((item) => (
                              <div key={item.id} className="flex items-center text-sm text-muted-foreground">
                                <span className="w-6 text-xs">{item.sort_order}.</span>
                                <span>{item.label}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      
      <AddFromDefaultPhasesDialog 
        open={showAddFromDefaultDialog}
        onOpenChange={setShowAddFromDefaultDialog}
      />
    </Card>
  );
}