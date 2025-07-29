
import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Edit, Trash2, UserPlus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { DataTable } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Task, useUpdateTask } from '@/hooks/useTasks';
import { useWorkers } from '@/hooks/useWorkers';
import { usePhases } from '@/hooks/usePhases';
import { StatusChip } from '@/components/admin/StatusChip';
import { format } from 'date-fns';

interface TasksTableProps {
  tasks: Task[];
  projectId: string;
  onTaskEdit: (task: Task) => void;
  onTaskDelete?: (taskId: string) => void;
}

const getPriorityBadgeVariant = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'destructive';
    case 'medium':
      return 'default';
    case 'low':
      return 'secondary';
    default:
      return 'outline';
  }
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'todo':
      return { variant: 'outline' as const, label: 'To Do' };
    case 'in_progress':
      return { variant: 'default' as const, label: 'In Progress' };
    case 'done':
      return { variant: 'secondary' as const, label: 'Done' };
    default:
      return { variant: 'outline' as const, label: status };
  }
};

export function TasksTable({ tasks, projectId, onTaskEdit, onTaskDelete }: TasksTableProps) {
  const updateTaskMutation = useUpdateTask();
  const { data: workers = [] } = useWorkers();
  const { data: phases = [] } = usePhases(projectId);
  const [selectedTasks, setSelectedTasks] = useState<Record<string, boolean>>({});
  const isMobile = useIsMobile();

  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    updateTaskMutation.mutate({
      id: taskId,
      status: newStatus
    });
  };

  const handleAssigneeChange = (taskId: string, assigneeId: string) => {
    updateTaskMutation.mutate({
      id: taskId,
      assignee: assigneeId || undefined
    });
  };

  const columns: ColumnDef<Task>[] = [
    {
      accessorKey: 'title',
      header: 'Task',
      cell: ({ row }) => {
        const task = row.original;
        return (
          <div className="space-y-1">
            <div className="font-medium text-foreground">{task.title}</div>
            {task.description && (
              <div className="text-sm text-muted-foreground line-clamp-2">
                {task.description}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const task = row.original;
        const statusConfig = getStatusConfig(task.status);
        
        return (
          <Select
            value={task.status}
            onValueChange={(value) => handleStatusChange(task.id, value as Task['status'])}
          >
            <SelectTrigger className="w-32">
              <SelectValue>
                <Badge variant={statusConfig.variant} className="text-xs">
                  {statusConfig.label}
                </Badge>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        );
      },
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => {
        const priority = row.getValue('priority') as string;
        return (
          <Badge variant={getPriorityBadgeVariant(priority)} className="text-xs capitalize">
            {priority}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'assignee',
      header: 'Assignee',
      cell: ({ row }) => {
        const task = row.original;
        const assignedWorker = workers.find(w => w.id === task.assignee);
        
        return (
          <Select
            value={task.assignee || 'unassigned'}
            onValueChange={(value) => handleAssigneeChange(task.id, value === 'unassigned' ? '' : value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Unassigned">
                {assignedWorker ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={assignedWorker.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {assignedWorker.full_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{assignedWorker.full_name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Unassigned</span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {workers.map(worker => (
                <SelectItem key={worker.id} value={worker.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={worker.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {worker.full_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span>{worker.full_name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    },
    {
      accessorKey: 'phase_id',
      header: 'Phase',
      cell: ({ row }) => {
        const task = row.original;
        const phase = phases.find(p => p.id === task.phase_id);
        
        return (
          <div className="text-sm">
            {phase ? (
              <Badge variant="outline" className="text-xs">
                {phase.name}
              </Badge>
            ) : (
              <span className="text-muted-foreground">No phase</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => {
        const date = row.getValue('created_at') as string;
        return (
          <div className="text-sm text-muted-foreground">
            {format(new Date(date), 'MMM d, yyyy')}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const task = row.original;
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onTaskEdit(task)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Task
              </DropdownMenuItem>
              {onTaskDelete && (
                <DropdownMenuItem 
                  onClick={() => onTaskDelete(task.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Task
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Mobile card view
  const MobileTaskCard = ({ task }: { task: Task }) => {
    const statusConfig = getStatusConfig(task.status);
    const assignedWorker = workers.find(w => w.id === task.assignee);
    const phase = phases.find(p => p.id === task.phase_id);

    return (
      <div className="bg-card p-4 rounded-lg border space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <h4 className="font-medium text-foreground">{task.title}</h4>
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onTaskEdit(task)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Task
              </DropdownMenuItem>
              {onTaskDelete && (
                <DropdownMenuItem 
                  onClick={() => onTaskDelete(task.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Task
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant={getPriorityBadgeVariant(task.priority)} className="text-xs capitalize">
              {task.priority}
            </Badge>
            {phase && (
              <Badge variant="outline" className="text-xs">
                {phase.name}
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Status</label>
              <Select
                value={task.status}
                onValueChange={(value) => handleStatusChange(task.id, value as Task['status'])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    <Badge variant={statusConfig.variant} className="text-xs">
                      {statusConfig.label}
                    </Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Assignee</label>
              <Select
                value={task.assignee || 'unassigned'}
                onValueChange={(value) => handleAssigneeChange(task.id, value === 'unassigned' ? '' : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Unassigned">
                    {assignedWorker ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={assignedWorker.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {assignedWorker.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{assignedWorker.full_name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {workers.map(worker => (
                    <SelectItem key={worker.id} value={worker.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={worker.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {worker.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span>{worker.full_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Created {format(new Date(task.created_at), 'MMM d, yyyy')}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {isMobile ? (
        <div className="space-y-4">
          {tasks.map((task) => (
            <MobileTaskCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={tasks}
          searchPlaceholder="Search tasks..."
          enableRowSelection={true}
          rowSelection={selectedTasks}
          onRowSelectionChange={setSelectedTasks}
        />
      )}
      
      {/* Bulk Actions */}
      {Object.keys(selectedTasks).length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">
            {Object.keys(selectedTasks).length} task(s) selected
          </span>
          <Button variant="outline" size="sm">
            Bulk Update Status
          </Button>
          <Button variant="outline" size="sm">
            Bulk Assign
          </Button>
        </div>
      )}
    </div>
  );
}
