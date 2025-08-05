import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  start_date?: string;
  end_date?: string;
  duration_days?: number;
}

interface CompactTaskCardProps {
  task: Task;
  className?: string;
}

export function CompactTaskCard({ task, className }: CompactTaskCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-muted text-muted-foreground';
      case 'in_progress': return 'bg-primary text-primary-foreground';
      case 'done': return 'bg-green-600 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-muted';
    }
  };

  const formatTime = () => {
    if (task.start_date) {
      const date = new Date(task.start_date);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
    return null;
  };

  return (
    <div 
      className={cn(
        "p-2 rounded-md border-l-2 bg-card hover:bg-accent/50 transition-colors cursor-pointer",
        getPriorityColor(task.priority),
        className
      )}
    >
      <div className="space-y-1">
        {/* Title */}
        <h4 className="text-xs font-medium text-card-foreground truncate leading-tight">
          {task.title}
        </h4>
        
        {/* Status and Time */}
        <div className="flex items-center justify-between gap-1">
          <Badge 
            variant="secondary" 
            className={cn("text-xs px-1 py-0 h-4", getStatusColor(task.status))}
          >
            {task.status.replace('_', ' ')}
          </Badge>
          
          {formatTime() && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatTime()}</span>
            </div>
          )}
        </div>
        
        {/* Duration indicator */}
        {task.duration_days && task.duration_days > 1 && (
          <div className="text-xs text-muted-foreground">
            {task.duration_days}d
          </div>
        )}
      </div>
    </div>
  );
}