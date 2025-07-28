
import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useCreateTask, useUpdateTask, CreateTaskData, Task } from '@/hooks/useTasks';
import { usePhases } from '@/hooks/usePhases';
import { useWorkers } from '@/hooks/useWorkers';
import { useUpdateTaskSchedule } from '@/hooks/useCalendarTasks';

const taskFormSchema = z.object({
  title: z.string().min(3, 'Task title must be at least 3 characters'),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'done']),
  priority: z.enum(['low', 'medium', 'high']),
  phase_id: z.string().optional(),
  assignee: z.string().optional(),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  duration_days: z.number().min(1).optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface TaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  editingTask?: Task | null;
  phaseId?: string;
}

export function TaskDrawer({ isOpen, onClose, projectId, editingTask, phaseId }: TaskDrawerProps) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateTaskSchedule = useUpdateTaskSchedule();
  const { data: phases = [] } = usePhases(projectId);
  const { data: workers = [] } = useWorkers();
  
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: editingTask?.title || '',
      description: editingTask?.description || '',
      status: editingTask?.status || 'todo',
      priority: editingTask?.priority || 'medium',
      phase_id: editingTask?.phase_id || phaseId || 'none',
      assignee: editingTask?.assignee || 'none',
    },
  });

  // Reset form when editingTask or phaseId changes
  useEffect(() => {
    if (editingTask) {
      form.reset({
        title: editingTask.title,
        description: editingTask.description || '',
        status: editingTask.status,
        priority: editingTask.priority,
        phase_id: editingTask.phase_id || 'none',
        assignee: editingTask.assignee || 'none',
        start_date: undefined,
        end_date: undefined,
        duration_days: undefined,
      });
    } else {
      form.reset({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        phase_id: phaseId || 'none',
        assignee: 'none',
        start_date: undefined,
        end_date: undefined,
        duration_days: undefined,
      });
    }
  }, [editingTask, phaseId, form]);

  const handleSubmit = async (data: TaskFormData) => {
    try {
      if (editingTask) {
        // Update existing task
        await updateTask.mutateAsync({
          id: editingTask.id,
          title: data.title,
          description: data.description || undefined,
          status: data.status,
          priority: data.priority,
          phase_id: data.phase_id === 'none' ? undefined : data.phase_id,
          assignee: data.assignee === 'none' ? undefined : data.assignee,
        });
        
        // Update calendar scheduling if dates are provided
        if (data.start_date || data.end_date || data.duration_days) {
          await updateTaskSchedule.mutateAsync({
            taskId: editingTask.id,
            start_date: data.start_date ? format(data.start_date, 'yyyy-MM-dd') : undefined,
            end_date: data.end_date ? format(data.end_date, 'yyyy-MM-dd') : undefined,
            duration_days: data.duration_days,
            is_scheduled: !!(data.start_date || data.end_date),
          });
        }
      } else {
        // Create new task with calendar scheduling
        const taskData: CreateTaskData = {
          title: data.title,
          description: data.description || undefined,
          status: data.status,
          priority: data.priority,
          phase_id: data.phase_id === 'none' ? undefined : data.phase_id,
          assignee: data.assignee === 'none' ? undefined : data.assignee,
        };
        
        const newTask = await createTask.mutateAsync({ projectId, data: taskData });
        
        // Add calendar scheduling if dates are provided
        if ((data.start_date || data.end_date || data.duration_days) && newTask) {
          await updateTaskSchedule.mutateAsync({
            taskId: newTask.id,
            start_date: data.start_date ? format(data.start_date, 'yyyy-MM-dd') : undefined,
            end_date: data.end_date ? format(data.end_date, 'yyyy-MM-dd') : undefined,
            duration_days: data.duration_days,
            is_scheduled: !!(data.start_date || data.end_date),
          });
        }
      }
      form.reset();
      onClose();
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Drawer open={isOpen} onOpenChange={handleClose}>
      <DrawerContent className="max-w-md mx-auto">
        <div className="p-6">
          <DrawerHeader className="px-0 pt-0">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DrawerTitle>
                <DrawerDescription>
                  {editingTask ? 'Update task details' : 'Add a new task to your project board.'}
                </DrawerDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DrawerHeader>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                placeholder="Enter task title"
                {...form.register('title')}
                className={form.formState.errors.title ? 'border-destructive' : ''}
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter task description (optional)"
                rows={3}
                {...form.register('description')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.watch('status')}
                  onValueChange={(value) => 
                    form.setValue('status', value as CreateTaskData['status'])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">Backlog</SelectItem>
                    <SelectItem value="in_progress">Active</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={form.watch('priority')}
                  onValueChange={(value) => 
                    form.setValue('priority', value as CreateTaskData['priority'])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {phases.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="phase">Phase (Optional)</Label>
                <Select
                  value={form.watch('phase_id')}
                  onValueChange={(value) => form.setValue('phase_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a phase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No phase</SelectItem>
                    {phases.map((phase) => (
                      <SelectItem key={phase.id} value={phase.id}>
                        {phase.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="assignee">Assign To (Optional)</Label>
              <Select
                value={form.watch('assignee')}
                onValueChange={(value) => form.setValue('assignee', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {workers.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.full_name} ({worker.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date (Optional)</Label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch('start_date') && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch('start_date') ? format(form.watch('start_date'), "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.watch('start_date')}
                      onSelect={(date) => {
                        form.setValue('start_date', date);
                        setStartDateOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch('end_date') && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch('end_date') ? format(form.watch('end_date'), "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.watch('end_date')}
                      onSelect={(date) => {
                        form.setValue('end_date', date);
                        setEndDateOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (Days)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                placeholder="Enter task duration in days"
                value={form.watch('duration_days') || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined;
                  form.setValue('duration_days', value);
                }}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={(createTask.isPending || updateTask.isPending) || !form.formState.isValid}
                className="flex-1"
              >
                {(createTask.isPending || updateTask.isPending) 
                  ? (editingTask ? 'Updating...' : 'Creating...') 
                  : (editingTask ? 'Update Task' : 'Create Task')
                }
              </Button>
            </div>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
