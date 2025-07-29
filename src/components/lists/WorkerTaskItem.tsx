import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  project?: { name: string };
  phase?: { name: string };
  task_list?: { name: string; color_hex: string; owner_id?: string };
}

interface WorkerTaskItemProps {
  task: Task;
}

export function WorkerTaskItem({ task }: WorkerTaskItemProps) {
  const isCompleted = task.status === 'done';
  const isInProgress = task.status === 'in_progress';
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-orange-500';
      case 'low': return 'text-green-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className={cn(
      "flex items-start gap-3 p-4 border border-border rounded-lg bg-card hover:shadow-sm transition-all duration-200",
      isCompleted && "opacity-75"
    )}>
      <Checkbox 
        checked={isCompleted}
        className="mt-0.5"
        disabled
      />
      
      <div className="flex-1 min-w-0">
        <h4 className={cn(
          "font-medium text-card-foreground mb-2 leading-tight",
          isCompleted && "line-through text-muted-foreground"
        )}>
          {task.title}
        </h4>
        
        <div className="flex items-center gap-2 flex-wrap">
          {isInProgress && (
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
              In Progress
            </Badge>
          )}
          
          <Badge variant="outline" className={cn("text-xs", getPriorityColor(task.priority))}>
            {task.priority}
          </Badge>
          
          {task.project && (
            <Badge variant="outline" className="text-xs">
              {task.project.name}
            </Badge>
          )}

          {task.phase && (
            <Badge variant="outline" className="text-xs text-purple-600">
              {task.phase.name}
            </Badge>
          )}

          {task.task_list && (
            <div className="flex items-center gap-1">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: task.task_list.color_hex }}
              />
              <Badge variant="outline" className="text-xs">
                {task.task_list.name}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}