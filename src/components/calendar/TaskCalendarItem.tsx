import React from 'react';
import { CalendarTask } from '@/hooks/useCalendarTasks';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TaskCalendarItemProps {
  task: CalendarTask;
  onClick?: () => void;
  isDraggable?: boolean;
}

export function TaskCalendarItem({ task, onClick, isDraggable = false }: TaskCalendarItemProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive text-destructive-foreground';
      case 'medium':
        return 'bg-warning text-warning-foreground';
      case 'low':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-success text-success-foreground';
      case 'in_progress':
        return 'bg-primary text-primary-foreground';
      case 'todo':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (isDraggable) {
      e.dataTransfer.setData('text/plain', task.id);
    }
  };

  const getDurationInfo = () => {
    if (task.duration_days) {
      return `${task.duration_days}d`;
    }
    if (task.start_date && task.end_date) {
      const start = new Date(task.start_date);
      const end = new Date(task.end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return `${diffDays}d`;
    }
    return '1d';
  };

  const getRemainingDays = () => {
    if (!task.end_date) return null;
    
    const today = new Date();
    const endDate = new Date(task.end_date);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays === 0) return 'Due today';
    return `${diffDays}d left`;
  };

  return (
    <div
      className={cn(
        "text-xs p-1 rounded cursor-pointer transition-all hover:shadow-sm",
        "border border-border/50",
        isDraggable && "cursor-move hover:scale-105"
      )}
      onClick={onClick}
      draggable={isDraggable}
      onDragStart={handleDragStart}
    >
      <div className="flex items-center justify-between mb-1">
        <Badge 
          variant="secondary" 
          className={cn("text-xs px-1 py-0", getPriorityColor(task.priority))}
        >
          {task.priority}
        </Badge>
        <span className="text-muted-foreground">
          {getDurationInfo()}
        </span>
      </div>
      
      <div className="font-medium truncate mb-1" title={task.title}>
        {task.title}
      </div>
      
      <div className="flex items-center justify-between">
        <Badge 
          variant="outline" 
          className={cn("text-xs px-1 py-0", getStatusColor(task.status))}
        >
          {task.status.replace('_', ' ')}
        </Badge>
        {task.end_date && (
          <span className={cn(
            "text-xs",
            getRemainingDays()?.includes('overdue') ? 'text-destructive' :
            getRemainingDays()?.includes('today') ? 'text-warning' :
            'text-muted-foreground'
          )}>
            {getRemainingDays()}
          </span>
        )}
      </div>
      
      {task.assignee_name && (
        <div className="text-xs text-muted-foreground mt-1 truncate">
          {task.assignee_name}
        </div>
      )}
      
      {task.phase_name && (
        <div className="text-xs text-muted-foreground truncate">
          {task.phase_name}
        </div>
      )}
    </div>
  );
}