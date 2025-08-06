
import { Badge } from '@/components/ui/badge';
import { useBulkTaskActions } from '@/hooks/useBulkTaskActions';
import { useTasks, useTasksByPhase } from '@/hooks/useTasks';

interface StatusChipProps {
  status: string;
  onStatusChange?: (newStatus: string) => void;
  disabled?: boolean;
  projectId?: string;
  phaseId?: string;
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

export function StatusChip({ status, onStatusChange, disabled, projectId, phaseId }: StatusChipProps) {
  const config = getStatusConfig(status);
  const { bulkUpdateTasks } = useBulkTaskActions();
  
  // Use phase-specific tasks if phaseId is provided, otherwise use project tasks
  const { data: projectTasks = [] } = useTasks(projectId || '');
  const { data: phaseTasks = [] } = useTasksByPhase(phaseId || '');
  
  const tasks = phaseId ? phaseTasks : projectTasks;

  const statusCycle = ['not_started', 'active', 'completed', 'blocked'];
  
  const getNextStatus = (currentStatus: string) => {
    const currentIndex = statusCycle.indexOf(currentStatus);
    return statusCycle[(currentIndex + 1) % statusCycle.length];
  };

  const handleStatusClick = () => {
    if (!onStatusChange || disabled) return;
    const nextStatus = getNextStatus(status);
    handleStatusSelect(nextStatus);
  };

  const handleStatusSelect = async (newStatus: string) => {
    if (!onStatusChange || disabled) return;
    
    // If changing to completed and we have tasks to complete
    if (newStatus === 'completed' && (projectId || phaseId) && tasks.length > 0) {
      const incompleteTasks = tasks.filter(task => task.status !== 'done');
      
      if (incompleteTasks.length > 0) {
        await bulkUpdateTasks.mutateAsync({
          taskIds: incompleteTasks.map(task => task.id),
          updates: { status: 'done' }
        });
      }
    }
    
    // If changing back to planning and we have completed tasks to revert
    if (newStatus === 'not_started' && (projectId || phaseId) && tasks.length > 0) {
      const completedTasks = tasks.filter(task => task.status === 'done');
      
      if (completedTasks.length > 0) {
        await bulkUpdateTasks.mutateAsync({
          taskIds: completedTasks.map(task => task.id),
          updates: { status: 'todo' }
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
    <Badge 
      variant={config.variant} 
      className={`capitalize whitespace-nowrap px-4 py-2 text-sm font-medium cursor-pointer transition-colors ${config.className || 'hover:bg-muted/50'}`}
      onClick={handleStatusClick}
    >
      {config.label}
    </Badge>
  );
}
