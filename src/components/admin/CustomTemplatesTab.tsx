import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CustomTemplatesTabProps {
  onCreateTemplate: () => void;
}

export function CustomTemplatesTab({ onCreateTemplate }: CustomTemplatesTabProps) {
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
          <p className="text-muted-foreground mb-4 max-w-sm">
            Start by creating your first custom checklist template to streamline your workflow.
          </p>
          <Button onClick={onCreateTemplate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Custom Template
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}