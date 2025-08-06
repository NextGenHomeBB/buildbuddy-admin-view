import { useState } from "react";
import { Plus, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhaseTemplateDrawer } from "@/components/admin/PhaseTemplateDrawer";
import { CustomTemplatesTab } from "@/components/admin/CustomTemplatesTab";
import { DefaultPhasesTab } from "@/components/admin/DefaultPhasesTab";

export function PhaseTemplateListPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Checklist Templates</h1>
          <p className="text-muted-foreground">
            Manage checklist templates and view default phases
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync All Phases
          </Button>
          <Button variant="outline">
            <Home className="h-4 w-4 mr-2" />
            Add Renovation Templates
          </Button>
          <Button onClick={() => setIsDrawerOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      <Tabs defaultValue="custom" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="custom">Custom Templates</TabsTrigger>
          <TabsTrigger value="default">Default Phases</TabsTrigger>
        </TabsList>
        <TabsContent value="custom" className="mt-6">
          <CustomTemplatesTab />
        </TabsContent>
        <TabsContent value="default" className="mt-6">
          <DefaultPhasesTab />
        </TabsContent>
      </Tabs>

      <PhaseTemplateDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
      />
    </div>
  );
}