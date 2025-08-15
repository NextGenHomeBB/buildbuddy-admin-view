import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { WorkerAssignmentDialog } from './WorkerAssignmentDialog';

interface ProjectSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUser: { id: string; full_name: string } | null;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
}

export function ProjectSelectionDialog({
  open,
  onOpenChange,
  selectedUser
}: ProjectSelectionDialogProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const { toast } = useToast();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description, status')
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: open
  });

  const handleContinue = () => {
    if (!selectedProjectId) {
      toast({
        title: "No Project Selected",
        description: "Please select a project to assign the worker to.",
        variant: "destructive",
      });
      return;
    }

    setShowAssignmentDialog(true);
  };

  const handleAssignmentComplete = () => {
    setShowAssignmentDialog(false);
    onOpenChange(false);
    setSelectedProjectId('');
    toast({
      title: "Worker Assigned",
      description: `${selectedUser?.full_name} has been assigned to the project.`,
    });
  };

  return (
    <>
      <Dialog open={open && !showAssignmentDialog} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Project</DialogTitle>
            <DialogDescription>
              Choose a project to assign {selectedUser?.full_name} to.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-4 w-4 bg-muted animate-pulse rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted animate-pulse rounded w-32" />
                          <div className="h-3 bg-muted animate-pulse rounded w-48" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : projects && projects.length > 0 ? (
              <RadioGroup value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <div className="space-y-3">
                  {projects.map((project) => (
                    <Card key={project.id} className={`cursor-pointer transition-colors ${selectedProjectId === project.id ? 'ring-2 ring-primary' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value={project.id} id={project.id} />
                          <Label htmlFor={project.id} className="flex-1 cursor-pointer">
                            <div>
                              <h4 className="font-medium">{project.name}</h4>
                              <p className="text-sm text-muted-foreground">{project.description}</p>
                              <p className="text-xs text-muted-foreground mt-1 capitalize">Status: {project.status}</p>
                            </div>
                          </Label>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </RadioGroup>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No projects available
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleContinue}
              disabled={!selectedProjectId}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WorkerAssignmentDialog
        open={showAssignmentDialog}
        onOpenChange={setShowAssignmentDialog}
        projectId={selectedProjectId}
        selectedWorkerId={selectedUser?.id}
        onWorkersAssigned={handleAssignmentComplete}
      />
    </>
  );
}