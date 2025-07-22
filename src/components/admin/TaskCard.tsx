
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Task } from '@/hooks/useTasks';
import { useWorkers } from '@/hooks/useWorkers';

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const { data: workers = [] } = useWorkers();
  
  const assignedWorker = workers.find(worker => worker.id === task.assignee);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="bg-card border rounded-lg p-4 space-y-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-sm text-foreground leading-tight">
          {task.title}
        </h4>
        <Badge variant={getPriorityColor(task.priority)} className="text-xs">
          {task.priority}
        </Badge>
      </div>
      
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {new Date(task.created_at).toLocaleDateString()}
        </div>
        
        {assignedWorker ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={assignedWorker.avatar_url} alt={assignedWorker.full_name} />
              <AvatarFallback className="text-xs">
                {assignedWorker.full_name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {assignedWorker.full_name}
            </span>
          </div>
        ) : (
          <Badge variant="outline" className="text-xs">
            Unassigned
          </Badge>
        )}
      </div>
    </div>
  );
}
