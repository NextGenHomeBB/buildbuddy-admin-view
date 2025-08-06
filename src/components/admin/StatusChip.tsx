
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

interface StatusChipProps {
  status: string;
  onStatusChange?: (newStatus: string) => void;
  disabled?: boolean;
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

export function StatusChip({ status, onStatusChange, disabled }: StatusChipProps) {
  const config = getStatusConfig(status);

  const statusOptions = [
    { value: 'not_started', label: 'Planning' },
    { value: 'in_progress', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'blocked', label: 'On Hold' },
  ];

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
          onClick={(e) => e.stopPropagation()}
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
