
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
        className: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400 shadow-lg'
      };
    case 'completed':
      return {
        variant: 'secondary' as const,
        label: 'Completed',
        className: 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-400 shadow-lg'
      };
    case 'on_hold':
      return {
        variant: 'destructive' as const,
        label: 'On Hold',
        className: 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-400 shadow-lg'
      };
    case 'cancelled':
      return {
        variant: 'outline' as const,
        label: 'Cancelled',
        className: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white border-gray-400 shadow-lg'
      };
    case 'planning':
      return {
        variant: 'outline' as const,
        label: 'Planning',
        className: 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-yellow-400 shadow-lg'
      };
    // Phase statuses (mapped to appropriate variants)
    case 'not_started':
      return {
        variant: 'outline' as const,
        label: 'Planning',
        className: 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-yellow-400 shadow-lg'
      };
    case 'in_progress':
      return {
        variant: 'default' as const,
        label: 'Active',
        className: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400 shadow-lg'
      };
    case 'blocked':
      return {
        variant: 'destructive' as const,
        label: 'On Hold',
        className: 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-400 shadow-lg'
      };
    default:
      return {
        variant: 'outline' as const,
        label: status.replace('_', ' '),
        className: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white border-gray-400 shadow-lg'
      };
  }
};

export function StatusChip({ status }: StatusChipProps) {
  const config = getStatusConfig(status);
  
  return (
    <Badge 
      variant={config.variant} 
      className={`capitalize whitespace-nowrap px-4 py-2 text-sm font-medium ${config.className}`}
    >
      {config.label}
    </Badge>
  );
}
