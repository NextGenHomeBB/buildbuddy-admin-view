import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhaseTemplateDrawer } from "@/components/admin/PhaseTemplateDrawer";
import { ChecklistTemplatesCard } from "@/components/admin/ChecklistTemplatesCard";

export function PhaseTemplateListPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Phase Templates</h1>
          <p className="text-muted-foreground">
            Manage reusable phase templates for quick project setup
          </p>
        </div>
        <Button onClick={() => setIsDrawerOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <ChecklistTemplatesCard />

      <PhaseTemplateDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
      />
    </div>
  );
}