import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, User } from 'lucide-react';
import { StatusChip } from '@/components/admin/StatusChip';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  start_date?: string;
  end_date?: string;
  assignee?: {
    full_name: string;
    avatar_url?: string;
  };
  phase?: {
    name: string;
  };
}

interface OptimizedTaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
}

export const OptimizedTaskCard = memo(({ task, onClick }: OptimizedTaskCardProps) => {
  const handleClick = () => {
    onClick?.(task);
  };

  const initials = task.assignee?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <Card 
      className="h-full cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium line-clamp-2">
            {task.title}
          </CardTitle>
          <StatusChip status={task.status} />
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
            {task.priority}
          </Badge>
          
          {task.assignee && (
            <div className="flex items-center space-x-1">
              <Avatar className="h-5 w-5">
                <AvatarImage src={task.assignee.avatar_url} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>
        
        {(task.start_date || task.end_date) && (
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {task.start_date && new Date(task.start_date).toLocaleDateString()}
              {task.start_date && task.end_date && ' - '}
              {task.end_date && new Date(task.end_date).toLocaleDateString()}
            </span>
          </div>
        )}
        
        {task.phase && (
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="truncate">{task.phase.name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

OptimizedTaskCard.displayName = 'OptimizedTaskCard';