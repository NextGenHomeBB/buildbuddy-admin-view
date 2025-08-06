
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { useBulkTaskActions } from '@/hooks/useBulkTaskActions';
import { useTasks } from '@/hooks/useTasks';

interface StatusChipProps {
  status: string;
  onStatusChange?: (newStatus: string) => void;
  disabled?: boolean;
  projectId?: string;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    // Project statuses
    case 'active':
      return {
        variant: 'default' as const,
        label: 'Active',
        className: ''
      };
    case 'completed':
      return {
        variant: 'secondary' as const,
        label: 'Completed',
        className: ''
      };
    case 'on_hold':
      return {
        variant: 'destructive' as const,
        label: 'On Hold',
        className: ''
      };
    case 'cancelled':
      return {
        variant: 'outline' as const,
        label: 'Cancelled',
        className: ''
      };
    case 'planning':
      return {
        variant: 'outline' as const,
        label: 'Planning',
        className: ''
      };
    // Phase statuses (mapped to appropriate variants)
    case 'not_started':
      return {
        variant: 'outline' as const,
        label: 'Planning',
        className: ''
      };
    case 'in_progress':
      return {
        variant: 'default' as const,
        label: 'Active',
        className: ''
      };
    case 'blocked':
      return {
        variant: 'destructive' as const,
        label: 'On Hold',
        className: ''
      };
    default:
      return {
        variant: 'outline' as const,
        label: status.replace('_', ' '),
        className: ''
      };
  }
};

const getNextStatus = (currentStatus: string): string => {
  const statusCycle = ['not_started', 'in_progress', 'completed', 'blocked'];
  const currentIndex = statusCycle.indexOf(currentStatus);
  const nextIndex = (currentIndex + 1) % statusCycle.length;
  return statusCycle[nextIndex];
};

export function StatusChip({ status, onStatusChange, disabled, projectId }: StatusChipProps) {
  const config = getStatusConfig(status);
  const { bulkUpdateTasks } = useBulkTaskActions();
  const { data: tasks = [] } = useTasks(projectId || '');

  const statusOptions = [
    { value: 'not_started', label: 'Planning' },
    { value: 'in_progress', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'blocked', label: 'On Hold' },
  ];

  const handleStatusClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!onStatusChange || disabled) return;
    
    const nextStatus = getNextStatus(status);
    
    // If changing to completed and we have a projectId, mark all tasks as completed
    if (nextStatus === 'completed' && projectId && tasks.length > 0) {
      const incompleteTasks = tasks.filter(task => task.status !== 'done');
      
      if (incompleteTasks.length > 0) {
        await bulkUpdateTasks.mutateAsync({
          taskIds: incompleteTasks.map(task => task.id),
          updates: { status: 'done' }
        });
      }
    }
    
    onStatusChange(nextStatus);
  };

  if (!onStatusChange || disabled) {
    return (
      <Badge 
        variant={config.variant} 
        className="capitalize whitespace-nowrap px-4 py-2 text-sm font-medium"
      >
        {config.label}
      </Badge>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-auto px-3 py-1.5 text-sm font-medium border-border hover:bg-muted/50"
          onClick={handleStatusClick}
        >
          <Badge 
            variant={config.variant} 
            className="capitalize whitespace-nowrap px-2 py-1 text-xs font-medium border-0 bg-transparent text-inherit hover:bg-transparent"
          >
            {config.label}
          </Badge>
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        {statusOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onStatusChange(option.value)}
            className={status === option.value ? 'bg-muted' : ''}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
