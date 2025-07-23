import { Badge } from '@/components/ui/badge';

interface StatusChipProps {
  status: string;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'active':
      return {
        variant: 'default' as const,
        label: 'Active'
      };
    case 'completed':
      return {
        variant: 'secondary' as const,
        label: 'Completed'
      };
    case 'on_hold':
      return {
        variant: 'destructive' as const,
        label: 'On Hold'
      };
    case 'cancelled':
      return {
        variant: 'outline' as const,
        label: 'Cancelled'
      };
    case 'planning':
      return {
        variant: 'outline' as const,
        label: 'Planning'
      };
    default:
      return {
        variant: 'outline' as const,
        label: status.replace('_', ' ')
      };
  }
};

export function StatusChip({ status }: StatusChipProps) {
  const config = getStatusConfig(status);
  
  return (
    <Badge variant={config.variant} className="capitalize whitespace-nowrap">
      {config.label}
    </Badge>
  );
}