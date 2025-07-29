import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useAssignTaskToList } from '@/hooks/useTaskLists';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee?: string;
  project?: { name: string };
  assignee_profile?: { full_name: string; avatar_url?: string };
}

interface TaskListItemProps {
  task: Task;
  showRemoveButton?: boolean;
}

export function TaskListItem({ task, showRemoveButton = false }: TaskListItemProps) {
  const assignTaskToList = useAssignTaskToList();

  const handleRemoveFromList = () => {
    assignTaskToList.mutate({ taskId: task.id, listId: null });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-secondary';
      case 'in_progress': return 'bg-blue-500';
      case 'done': return 'bg-green-500';
      default: return 'bg-secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card hover:shadow-sm transition-shadow">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="font-medium text-card-foreground truncate">{task.title}</h4>
          {showRemoveButton && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              onClick={handleRemoveFromList}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Badge 
            variant="secondary" 
            className={`text-xs ${getStatusColor(task.status)} text-white`}
          >
            {task.status.replace('_', ' ')}
          </Badge>
          
          <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </Badge>
          
          {task.project && (
            <Badge variant="outline" className="text-xs">
              {task.project.name}
            </Badge>
          )}
        </div>
      </div>

      {task.assignee_profile && (
        <div className="flex items-center gap-2 ml-3">
          <Avatar className="h-6 w-6">
            <AvatarImage src={task.assignee_profile.avatar_url} />
            <AvatarFallback className="text-xs">
              {task.assignee_profile.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {task.assignee_profile.full_name}
          </span>
        </div>
      )}
    </div>
  );
}