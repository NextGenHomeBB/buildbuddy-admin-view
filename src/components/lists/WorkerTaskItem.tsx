import { Badge } from '@/components/ui/badge';

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
        <h4 className="font-medium text-card-foreground truncate mb-2">{task.title}</h4>
        
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