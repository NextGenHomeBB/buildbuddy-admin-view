
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Task } from '@/hooks/useTasks';

interface KanbanColumnProps {
  title: string;
  tasks: Task[];
  status: string;
  projectId: string;
  onTaskClick: (task: Task) => void;
}

const getPriorityBadgeVariant = (priority: string) => {
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

export function KanbanColumn({ title, tasks, status, onTaskClick }: KanbanColumnProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge variant="outline" className="text-xs">
            {tasks.length}
          </Badge>
        </div>
        <CardDescription>
          {status === 'todo' && 'Tasks waiting to be started'}
          {status === 'in_progress' && 'Tasks currently in progress'}
          {status === 'done' && 'Completed tasks'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No tasks
          </div>
        ) : (
          tasks.map((task) => (
            <Card 
              key={task.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onTaskClick(task)}
            >
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
                    <Badge variant={getPriorityBadgeVariant(task.priority)} className="text-xs ml-2">
                      {task.priority}
                    </Badge>
                  </div>
                  
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {task.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {task.created_at && new Date(task.created_at).toLocaleDateString()}
                    </span>
                    {task.assignee && (
                      <Badge variant="outline" className="text-xs">
                        Assigned
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}
