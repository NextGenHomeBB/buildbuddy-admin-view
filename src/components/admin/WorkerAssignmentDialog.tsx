import { useState, useEffect } from 'react';
import { useWorkers } from '@/hooks/useWorkers';
import { useAddWorkers } from '@/hooks/useAddWorkers';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface WorkerAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  selectedWorkerId?: string;
  onWorkersAssigned?: () => void;
}

export function WorkerAssignmentDialog({
  open,
  onOpenChange,
  projectId,
  selectedWorkerId,
  onWorkersAssigned
}: WorkerAssignmentDialogProps) {
  const { data: workers, isLoading } = useWorkers();
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const { user, session } = useAuth();
  const addWorkersMutation = useAddWorkers();
  const { toast } = useToast();

  // Pre-select the worker if provided
  useEffect(() => {
    if (selectedWorkerId && !selectedWorkers.includes(selectedWorkerId)) {
      setSelectedWorkers([selectedWorkerId]);
    }
  }, [selectedWorkerId, selectedWorkers]);

  const handleWorkerToggle = (workerId: string) => {
    setSelectedWorkers(prev => 
      prev.includes(workerId) 
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  const handleAssignWorkers = async () => {
    if (!projectId || selectedWorkers.length === 0) {
      console.warn('Cannot assign workers: missing projectId or no workers selected');
      return;
    }

    // Debug authentication state
    console.log('Assignment attempt:', {
      projectId,
      selectedWorkers,
      user: user?.id,
      session: session?.access_token ? 'present' : 'missing',
      userRole: user?.role
    });

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to assign workers.",
        variant: "destructive",
      });
      return;
    }

    if (!session?.access_token) {
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addWorkersMutation.mutateAsync({
        projectId,
        workerIds: selectedWorkers
      });

      setSelectedWorkers([]);
      onWorkersAssigned?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Worker assignment failed:', {
        error,
        projectId,
        selectedWorkers,
        user: user?.id
      });
      // Error is already handled by the mutation hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Workers</DialogTitle>
          <DialogDescription>
            Select workers to assign to this project.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                  <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 bg-muted animate-pulse rounded w-24" />
                    <div className="h-3 bg-muted animate-pulse rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : workers && workers.length > 0 ? (
            workers.map((worker) => (
              <div key={worker.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                <Checkbox
                  id={worker.id}
                  checked={selectedWorkers.includes(worker.id)}
                  onCheckedChange={() => handleWorkerToggle(worker.id)}
                />
                <Avatar className="h-10 w-10">
                  <AvatarImage src={worker.avatar_url} alt={worker.full_name} />
                  <AvatarFallback>
                    {worker.full_name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{worker.full_name}</p>
                  <Badge variant="secondary" className="text-xs">
                    {worker.role}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No workers available to assign
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={addWorkersMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAssignWorkers}
            disabled={selectedWorkers.length === 0 || addWorkersMutation.isPending}
          >
            {addWorkersMutation.isPending ? 'Assigning...' : `Assign ${selectedWorkers.length} Worker(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}