
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
        <Users className="h-5 w-5" />
        <span>Loading team members...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Team Members</h3>
            <p className="text-sm text-muted-foreground">
              {projectWorkers.length} member{projectWorkers.length !== 1 ? 's' : ''} assigned
            </p>
          </div>
        </div>
        
        <Popover open={isAddingWorker} onOpenChange={setIsAddingWorker}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 bg-white/80 backdrop-blur-sm"
              disabled={availableWorkers.length === 0}
            >
              <Plus className="h-4 w-4" />
              Add Member
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
                  {assignWorker.isPending ? 'Assigning to Project...' : 'Assign to Project'}
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
        <div className="text-sm text-muted-foreground py-4 text-center bg-white/40 rounded-lg border border-white/20">
          No team members assigned yet. Click "Add Member" to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {projectWorkers.map((worker) => (
            <div
              key={worker.id}
              className="flex items-center gap-3 bg-white/40 backdrop-blur-sm rounded-lg p-3 border border-white/20"
            >
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={worker.profiles?.avatar_url} />
                  <AvatarFallback className="text-sm bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {worker.profiles?.full_name?.charAt(0) || 'W'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate text-foreground">
                  {worker.profiles?.full_name || 'Unknown Worker'}
                </div>
                <Badge variant="outline" className="text-xs mt-1">
                  {worker.role}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleUnassignWorker(worker.user_id)}
                disabled={unassignWorker.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
