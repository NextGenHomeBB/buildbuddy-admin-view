import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight, Edit, RefreshCw } from "lucide-react";
import { usePhaseTemplates } from "@/hooks/useTemplates";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface ChecklistTemplatesCardProps {
  className?: string;
}

export function ChecklistTemplatesCard({ className }: ChecklistTemplatesCardProps) {
  const { data: phaseTemplates, isLoading } = usePhaseTemplates();
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const togglePhase = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  const handleEdit = (phaseId: string) => {
    navigate(`/admin/phase-templates/${phaseId}`);
  };

  const handleSync = (phaseId: string) => {
    // TODO: Implement sync functionality
    console.log("Sync phase:", phaseId);
  };

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!phaseTemplates?.length) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6 text-center text-muted-foreground">
          No phase templates found. Create your first template to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {phaseTemplates.map((phase) => {
        const isExpanded = expandedPhases.has(phase.id);
        const checklistCount = phase.checklist_templates?.length || 0;

        return (
          <Card key={phase.id} className="w-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePhase(phase.id)}
                    className="h-6 w-6 p-0"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <div>
                    <h3 className="font-semibold text-foreground">{phase.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {checklistCount} {checklistCount === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(phase.id)}
                    className="h-8 px-3"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Sync
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(phase.id)}
                    className="h-8 px-3"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            {isExpanded && (
              <CardContent className="pt-0">
                <div className="space-y-3 pl-9">
                  {phase.checklist_templates?.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <Checkbox 
                        id={`checklist-${item.id}`}
                        className="h-4 w-4"
                      />
                      <label 
                        htmlFor={`checklist-${item.id}`}
                        className="text-sm text-foreground cursor-pointer flex-1"
                      >
                        {item.label}
                      </label>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground">
                      No checklist items yet. Edit this template to add items.
                    </p>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}