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
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6", className)}>
      {phaseTemplates.map((phase) => {
        const isExpanded = expandedPhases.has(phase.id);
        const checklistCount = phase.checklist_templates?.length || 0;

        return (
          <Card key={phase.id} className="w-full h-fit transition-all duration-200 hover:shadow-md hover:shadow-primary/10">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePhase(phase.id)}
                    className="h-11 w-11 p-0 shrink-0 hover:bg-accent"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </Button>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground truncate">{phase.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {checklistCount} {checklistCount === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(phase.id)}
                    className="h-11 px-3 hover:bg-accent hover:border-accent-foreground/20 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Sync</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(phase.id)}
                    className="h-11 px-3 hover:bg-accent hover:border-accent-foreground/20 transition-colors"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            {isExpanded && (
              <CardContent className="pt-0">
                <div className="space-y-4 pl-2 sm:pl-14">
                  {phase.checklist_templates?.map((item) => (
                    <div key={item.id} className="flex items-center gap-4">
                      <Checkbox 
                        id={`checklist-${item.id}`}
                        className="h-5 w-5"
                      />
                      <label 
                        htmlFor={`checklist-${item.id}`}
                        className="text-sm text-foreground cursor-pointer flex-1 leading-relaxed"
                      >
                        {item.label}
                      </label>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground pl-2">
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