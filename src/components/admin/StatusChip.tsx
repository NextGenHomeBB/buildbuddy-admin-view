
import { Badge } from '@/components/ui/badge';

interface StatusChipProps {
  status: string;
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

export function StatusChip({ status }: StatusChipProps) {
  const config = getStatusConfig(status);
  
  return (
    <Badge 
      variant={config.variant} 
      className="capitalize whitespace-nowrap px-4 py-2 text-sm font-medium"
    >
      {config.label}
    </Badge>
  );
}
