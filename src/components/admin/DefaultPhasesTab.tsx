import { useState } from "react";
import { Edit, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePhaseTemplates } from "@/hooks/useTemplates";

export function DefaultPhasesTab() {
  const navigate = useNavigate();
  const { data: phaseTemplates, isLoading } = usePhaseTemplates();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!phaseTemplates?.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">No default phases found.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {phaseTemplates.map((phase) => {
              const isExpanded = expandedRows.has(phase.id);
              const checklistCount = phase.checklist_templates?.length || 0;
              
              return (
                <>
                  <TableRow key={phase.id} className="hover:bg-muted/50">
                    <TableCell>
                      {checklistCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRow(phase.id)}
                          className="h-6 w-6 p-0"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{phase.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {checklistCount} {checklistCount === 1 ? 'item' : 'items'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {phase.description || "No description"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(phase.id)}
                          className="h-8 w-8 p-0 hover:bg-accent"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded && checklistCount > 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-muted/30 p-4">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm text-muted-foreground mb-3">
                            Checklist Items:
                          </h4>
                          <div className="grid gap-2">
                            {phase.checklist_templates?.map((item, index) => (
                              <div key={item.id} className="flex items-center gap-2 text-sm">
                                <div className="w-4 h-4 border border-border rounded-sm bg-background" />
                                <span>{item.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}