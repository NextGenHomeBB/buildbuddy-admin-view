import { useState } from 'react';
import { Users, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useProjectWorkers, useAssignWorkerToProject, useUnassignWorkerFromProject } from '@/hooks/useProjectWorkers';
import { useWorkers } from '@/hooks/useWorkers';

interface ProjectWorkersSectionProps {
  projectId: string;
}

export function ProjectWorkersSection({ projectId }: ProjectWorkersSectionProps) {
  const [isAddingWorker, setIsAddingWorker] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  
  const { data: projectWorkers = [], isLoading: loadingProjectWorkers } = useProjectWorkers(projectId);
  const { data: allWorkers = [], isLoading: loadingAllWorkers } = useWorkers();
  const assignWorker = useAssignWorkerToProject();
  const unassignWorker = useUnassignWorkerFromProject();

  // Filter out workers already assigned to the project
  const availableWorkers = allWorkers.filter(
    worker => !projectWorkers.some(pw => pw.user_id === worker.id)
  );

  const handleAssignWorker = async () => {
    if (!selectedWorkerId) return;
    
    await assignWorker.mutateAsync({
      projectId,
      userId: selectedWorkerId,
    });
    
    setSelectedWorkerId('');
    setIsAddingWorker(false);
  };

  const handleUnassignWorker = async (userId: string) => {
    await unassignWorker.mutateAsync({
      projectId,
      userId,
    });
  };

  if (loadingProjectWorkers) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>Loading workers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Team Members</span>
          <Badge variant="secondary" className="text-xs">
            {projectWorkers.length}
          </Badge>
        </div>
        
        <Popover open={isAddingWorker} onOpenChange={setIsAddingWorker}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              disabled={availableWorkers.length === 0}
            >
              <Plus className="h-3 w-3" />
              Add Worker
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <h4 className="font-medium">Assign Worker to Project</h4>
              <div className="space-y-2">
                <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a worker" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableWorkers.map((worker) => (
                      <SelectItem key={worker.id} value={worker.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={worker.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {worker.full_name?.charAt(0) || 'W'}
                            </AvatarFallback>
                          </Avatar>
                          <span>{worker.full_name}</span>
                          <Badge variant="outline" className="ml-auto text-xs">
                            {worker.role}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleAssignWorker}
                  disabled={!selectedWorkerId || assignWorker.isPending}
                  size="sm"
                  className="flex-1"
                >
                  {assignWorker.isPending ? 'Assigning...' : 'Assign'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsAddingWorker(false);
                    setSelectedWorkerId('');
                  }}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {projectWorkers.length === 0 ? (
        <div className="text-sm text-muted-foreground py-2">
          No workers assigned to this project yet.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {projectWorkers.map((worker) => (
            <div
              key={worker.id}
              className="flex items-center gap-2 bg-muted/50 rounded-lg p-2 pr-1"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={worker.profiles?.avatar_url} />
                <AvatarFallback className="text-xs">
                  {worker.profiles?.full_name?.charAt(0) || 'W'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {worker.profiles?.full_name || 'Unknown Worker'}
                </div>
                <Badge variant="outline" className="text-xs">
                  {worker.role}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleUnassignWorker(worker.user_id)}
                disabled={unassignWorker.isPending}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}