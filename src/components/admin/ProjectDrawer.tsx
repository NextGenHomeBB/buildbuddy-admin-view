import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ProjectForm } from './ProjectForm';
import { Project } from '@/types/admin';

interface ProjectDrawerProps {
  project?: Project;
  trigger?: React.ReactNode;
}

export function ProjectDrawer({ project, trigger }: ProjectDrawerProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button className="admin-button-primary gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {project ? 'Edit Project' : 'Create New Project'}
          </SheetTitle>
          <SheetDescription>
            {project ? 'Update project details below.' : 'Fill in the details to create a new project.'}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <ProjectForm project={project} onSuccess={handleSuccess} />
        </div>
      </SheetContent>
    </Sheet>
  );
}