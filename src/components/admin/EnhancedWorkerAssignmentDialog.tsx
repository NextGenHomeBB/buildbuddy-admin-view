import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, UserPlus, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAvailableWorkersForProject, useAssignMultipleWorkers } from '@/hooks/useProjectWorkers';

interface EnhancedWorkerAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onWorkersAssigned?: () => void;
}

export function EnhancedWorkerAssignmentDialog({
  open,
  onOpenChange,
  projectId,
  onWorkersAssigned
}: EnhancedWorkerAssignmentDialogProps) {
  const { data: workers = [], isLoading } = useAvailableWorkersForProject(projectId);
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const assignWorkersMutation = useAssignMultipleWorkers();

  // Reset selection when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedWorkers([]);
    }
  }, [open]);

  const assignedWorkers = workers.filter(w => w.is_assigned);
  const availableWorkers = workers.filter(w => !w.is_assigned);

  const handleWorkerToggle = (workerId: string) => {
    setSelectedWorkers(prev => 
      prev.includes(workerId) 
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  const handleAssignWorkers = async () => {
    if (selectedWorkers.length === 0) return;

    console.log('[UI] Attempting to assign workers:', {
      projectId,
      selectedWorkers,
      count: selectedWorkers.length
    });

    try {
      await assignWorkersMutation.mutateAsync({
        projectId,
        workerIds: selectedWorkers
      });

      console.log('[UI] Assignment successful, cleaning up');
      setSelectedWorkers([]);
      onWorkersAssigned?.();
      onOpenChange(false);
    } catch (error) {
      console.error('[UI] Worker assignment failed:', error);
      // Error handling is done by the mutation hook, no need to duplicate here
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Project Team
          </DialogTitle>
          <DialogDescription>
            Assign workers to this project. Workers need to be assigned before they can receive tasks.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Already Assigned Workers */}
          {assignedWorkers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                <CheckCircle className="h-4 w-4" />
                Already Assigned ({assignedWorkers.length})
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {assignedWorkers.map((worker) => (
                  <div key={worker.id} className="flex items-center space-x-3 p-2 bg-muted/50 rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={worker.avatar_url} alt={worker.full_name} />
                      <AvatarFallback className="text-xs">
                        {worker.full_name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{worker.full_name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {worker.role}
                      </Badge>
                    </div>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                ))}
              </div>
              {availableWorkers.length > 0 && <Separator className="my-4" />}
            </div>
          )}

          {/* Available Workers */}
          {availableWorkers.length > 0 && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                <UserPlus className="h-4 w-4" />
                Available to Assign ({availableWorkers.length})
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                        <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
                        <div className="flex-1 space-y-1">
                          <div className="h-4 bg-muted animate-pulse rounded w-24" />
                          <div className="h-3 bg-muted animate-pulse rounded w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  availableWorkers.map((worker) => (
                    <div key={worker.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id={worker.id}
                        checked={selectedWorkers.includes(worker.id)}
                        onCheckedChange={() => handleWorkerToggle(worker.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={worker.avatar_url} alt={worker.full_name} />
                        <AvatarFallback className="text-xs">
                          {worker.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{worker.full_name}</p>
                        <Badge variant="outline" className="text-xs">
                          {worker.role}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {!isLoading && availableWorkers.length === 0 && assignedWorkers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No workers available to assign</p>
            </div>
          )}

          {!isLoading && availableWorkers.length === 0 && assignedWorkers.length > 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">All available workers are already assigned to this project.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={assignWorkersMutation.isPending}
          >
            Close
          </Button>
          {availableWorkers.length > 0 && (
            <Button 
              onClick={handleAssignWorkers}
              disabled={selectedWorkers.length === 0 || assignWorkersMutation.isPending}
            >
              {assignWorkersMutation.isPending 
                ? 'Assigning...' 
                : `Assign ${selectedWorkers.length} Worker${selectedWorkers.length !== 1 ? 's' : ''}`
              }
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}