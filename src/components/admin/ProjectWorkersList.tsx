import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Users } from 'lucide-react';
import { useUnassignWorkerFromProject } from '@/hooks/useProjectWorkers';
import { ProjectWorker } from '@/hooks/useProjectWorkers';

interface ProjectWorkersListProps {
  workers: ProjectWorker[];
  projectId: string;
  isLoading?: boolean;
}

export function ProjectWorkersList({ workers, projectId, isLoading }: ProjectWorkersListProps) {
  const unassignWorkerMutation = useUnassignWorkerFromProject();

  const handleRemoveWorker = (userId: string) => {
    unassignWorkerMutation.mutate({
      projectId,
      userId
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
            <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-muted animate-pulse rounded w-24" />
              <div className="h-3 bg-muted animate-pulse rounded w-16" />
            </div>
            <div className="h-8 w-8 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (workers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-lg">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-sm">No workers assigned to this project yet.</p>
        <p className="text-xs mt-1">Click "Manage Workers" to assign team members.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {workers.map((worker) => (
        <div
          key={worker.id}
          className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={worker.profiles?.avatar_url} alt={worker.profiles?.full_name} />
            <AvatarFallback>
              {worker.profiles?.full_name?.split(' ').map(n => n[0]).join('') || 'W'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{worker.profiles?.full_name || 'Unknown Worker'}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {worker.role}
              </Badge>
              {worker.assigned_at && (
                <span className="text-xs text-muted-foreground">
                  Added {new Date(worker.assigned_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => handleRemoveWorker(worker.user_id)}
            disabled={unassignWorkerMutation.isPending}
            aria-label={`Remove ${worker.profiles?.full_name} from project`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}