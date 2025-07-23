
import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { X } from 'lucide-react';

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
import { useCreateTask, useUpdateTask, CreateTaskData, Task } from '@/hooks/useTasks';
import { usePhases } from '@/hooks/usePhases';
import { useWorkers } from '@/hooks/useWorkers';

const taskFormSchema = z.object({
  title: z.string().min(3, 'Task title must be at least 3 characters'),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'done']),
  priority: z.enum(['low', 'medium', 'high']),
  phase_id: z.string().optional(),
  assignee: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface TaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  editingTask?: Task | null;
}

export function TaskDrawer({ isOpen, onClose, projectId, editingTask }: TaskDrawerProps) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { data: phases = [] } = usePhases(projectId);
  const { data: workers = [] } = useWorkers();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: editingTask?.title || '',
      description: editingTask?.description || '',
      status: editingTask?.status || 'todo',
      priority: editingTask?.priority || 'medium',
      phase_id: editingTask?.phase_id || 'none',
      assignee: editingTask?.assignee || 'none',
    },
  });

  // Reset form when editingTask changes
  useEffect(() => {
    if (editingTask) {
      form.reset({
        title: editingTask.title,
        description: editingTask.description || '',
        status: editingTask.status,
        priority: editingTask.priority,
        phase_id: editingTask.phase_id || 'none',
        assignee: editingTask.assignee || 'none',
      });
    } else {
      form.reset({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        phase_id: 'none',
        assignee: 'none',
      });
    }
  }, [editingTask, form]);

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
      } else {
        // Create new task
        const taskData: CreateTaskData = {
          title: data.title,
          description: data.description || undefined,
          status: data.status,
          priority: data.priority,
          phase_id: data.phase_id === 'none' ? undefined : data.phase_id,
          assignee: data.assignee === 'none' ? undefined : data.assignee,
        };
        await createTask.mutateAsync({ projectId, data: taskData });
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
