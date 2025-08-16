import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ProjectWorkersList } from '@/components/admin/ProjectWorkersList';
import { EnhancedWorkerAssignmentDialog } from '@/components/admin/EnhancedWorkerAssignmentDialog';
import { ProjectAwareTaskDialog } from '@/components/admin/ProjectAwareTaskDialog';
import { useProjectWorkers } from '@/hooks/useProjectWorkers';

interface ProjectPeopleTabProps {
  projectId: string;
}

export function ProjectPeopleTab({ projectId }: ProjectPeopleTabProps) {
  const [isWorkerDialogOpen, setIsWorkerDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  
  const { data: projectWorkers = [], isLoading: assignmentsLoading } = useProjectWorkers(projectId);

  const handleWorkersAssigned = () => {
    // Data will be automatically refetched due to query invalidation
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Project Team</h2>
          <p className="text-sm text-muted-foreground">
            Manage workers assigned to this project ({projectWorkers.length} assigned)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsTaskDialogOpen(true)}
            variant="outline"
            disabled={projectWorkers.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
          <Button
            onClick={() => setIsWorkerDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Manage Workers
          </Button>
        </div>
      </div>

      <ProjectWorkersList
        workers={projectWorkers}
        projectId={projectId}
        isLoading={assignmentsLoading}
      />

      <EnhancedWorkerAssignmentDialog
        open={isWorkerDialogOpen}
        onOpenChange={setIsWorkerDialogOpen}
        projectId={projectId}
        onWorkersAssigned={handleWorkersAssigned}
      />

      <ProjectAwareTaskDialog
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        projectId={projectId}
      />
    </div>
  );
}