import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AssignmentGrid } from '@/components/admin/AssignmentGrid';
import { AddWorkersDrawer } from '@/components/admin/AddWorkersDrawer';
import { useAssignments } from '@/hooks/useAssignments';
import { useWorkers } from '@/hooks/useWorkers';
import { useAddWorkers } from '@/hooks/useAddWorkers';
import { useUnassignWorkerFromProject } from '@/hooks/useProjectWorkers';

interface ProjectPeopleTabProps {
  projectId: string;
}

export function ProjectPeopleTab({ projectId }: ProjectPeopleTabProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const { data: assignments = [], isLoading: assignmentsLoading } = useAssignments(projectId);
  const { data: allWorkers = [], isLoading: workersLoading } = useWorkers();
  const addWorkersMutation = useAddWorkers();
  const unassignWorkerMutation = useUnassignWorkerFromProject();

  // Get workers not already assigned to this project
  const assignedWorkerIds = assignments.map(a => a.user_id);
  const availableWorkers = allWorkers.filter(worker => !assignedWorkerIds.includes(worker.id));

  const handleAssignWorkers = (workerIds: string[]) => {
    console.log('ProjectPeopleTab: Assigning workers', { projectId, workerIds });
    addWorkersMutation.mutate({ projectId, workerIds });
  };

  const handleRemoveWorker = (assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (assignment) {
      unassignWorkerMutation.mutate({ 
        projectId, 
        userId: assignment.user_id 
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Project Team</h2>
          <p className="text-sm text-muted-foreground">
            Manage workers assigned to this project ({assignments.length} assigned)
          </p>
        </div>
        <Button
          onClick={() => setIsDrawerOpen(true)}
          disabled={availableWorkers.length === 0 || workersLoading}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Workers
        </Button>
      </div>

      <AssignmentGrid
        assignments={assignments}
        onRemoveWorker={handleRemoveWorker}
        isLoading={assignmentsLoading}
      />

      <AddWorkersDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        availableWorkers={availableWorkers}
        onAssignWorkers={handleAssignWorkers}
        isLoading={addWorkersMutation.isPending}
      />
    </div>
  );
}