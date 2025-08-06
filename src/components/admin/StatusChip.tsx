
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
        variant: 'outline' as const,
        label: 'Active',
        className: 'bg-orange-500 text-white border-orange-500 hover:bg-orange-600'
      };
    case 'completed':
      return {
        variant: 'outline' as const,
        label: 'Completed',
        className: 'bg-green-500 text-white border-green-500 hover:bg-green-600'
      };
    case 'on_hold':
      return {
        variant: 'outline' as const,
        label: 'On Hold',
        className: 'bg-red-500 text-white border-red-500 hover:bg-red-600'
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
    case 'blocked':
      return {
        variant: 'outline' as const,
        label: 'On Hold',
        className: 'bg-red-500 text-white border-red-500 hover:bg-red-600'
      };
    default:
      return {
        variant: 'outline' as const,
        label: status.replace('_', ' '),
        className: ''
      };
  }
};

export function StatusChip({ status, onStatusChange, disabled, projectId }: StatusChipProps) {
  const config = getStatusConfig(status);
  const { bulkUpdateTasks } = useBulkTaskActions();
  const { data: tasks = [] } = useTasks(projectId || '');

  const statusOptions = [
    { value: 'not_started', label: 'Planning' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'blocked', label: 'On Hold' },
  ];

  const handleStatusSelect = async (newStatus: string) => {
    if (!onStatusChange || disabled) return;
    
    // If changing to completed and we have a projectId, mark all tasks as completed
    if (newStatus === 'completed' && projectId && tasks.length > 0) {
      const incompleteTasks = tasks.filter(task => task.status !== 'done');
      
      if (incompleteTasks.length > 0) {
        await bulkUpdateTasks.mutateAsync({
          taskIds: incompleteTasks.map(task => task.id),
          updates: { status: 'done' }
        });
      }
    }
    
    onStatusChange(newStatus);
  };

  if (!onStatusChange || disabled) {
    return (
      <Badge 
        variant={config.variant} 
        className={`capitalize whitespace-nowrap px-4 py-2 text-sm font-medium ${config.className}`}
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
        >
          <Badge 
            variant={config.variant} 
            className={`capitalize whitespace-nowrap px-2 py-1 text-xs font-medium border-0 ${config.className || 'bg-transparent text-inherit hover:bg-transparent'}`}
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
            onClick={() => handleStatusSelect(option.value)}
            className={status === option.value ? 'bg-muted' : ''}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
