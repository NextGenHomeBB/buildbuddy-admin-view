import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, UserPlus, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { useProjectWorkers, useAvailableWorkersForProject } from '@/hooks/useProjectWorkers';
import { useProjectAwareTaskAssignment } from '@/hooks/useProjectAwareTaskAssignment';

interface ProjectAwareTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  phaseId?: string;
  preselectedWorkerId?: string;
}

export function ProjectAwareTaskDialog({
  open,
  onOpenChange,
  projectId,
  phaseId,
  preselectedWorkerId
}: ProjectAwareTaskDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigneeId: preselectedWorkerId || '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    dueDate: undefined as Date | undefined
  });

  const { data: projectWorkers = [] } = useProjectWorkers(projectId);
  const { data: allWorkers = [] } = useAvailableWorkersForProject(projectId);
  const createTaskMutation = useProjectAwareTaskAssignment();

  const availableWorkers = allWorkers.filter(w => w.is_assigned);
  const unassignedWorkers = allWorkers.filter(w => !w.is_assigned);
  const selectedWorker = allWorkers.find(w => w.id === formData.assigneeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.assigneeId) return;

    try {
      await createTaskMutation.mutateAsync({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        assigneeId: formData.assigneeId,
        projectId,
        phaseId,
        dueDate: formData.dueDate?.toISOString(),
        priority: formData.priority
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        assigneeId: '',
        priority: 'medium',
        dueDate: undefined
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Task creation failed:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      assigneeId: preselectedWorkerId || '',
      priority: 'medium',
      dueDate: undefined
    });
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>
            Create a new task and assign it to a project worker.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter task title..."
              required
            />
          </div>

          {/* Task Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the task..."
              rows={3}
            />
          </div>

          {/* Worker Assignment */}
          <div className="space-y-2">
            <Label>Assign to Worker *</Label>
            
            {availableWorkers.length > 0 ? (
              <Select
                value={formData.assigneeId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, assigneeId: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a worker...">
                    {selectedWorker && (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={selectedWorker.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {selectedWorker.full_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{selectedWorker.full_name}</span>
                        {!selectedWorker.is_assigned && (
                          <Badge variant="outline" className="text-xs">Will be assigned</Badge>
                        )}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableWorkers.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={worker.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {worker.full_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span>{worker.full_name}</span>
                        <Badge variant="secondary" className="text-xs">Assigned</Badge>
                      </div>
                    </SelectItem>
                  ))}
                  {unassignedWorkers.length > 0 && availableWorkers.length > 0 && (
                    <div className="px-2 py-1 text-xs text-muted-foreground border-t">
                      Will be assigned to project:
                    </div>
                  )}
                  {unassignedWorkers.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={worker.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {worker.full_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span>{worker.full_name}</span>
                        <Badge variant="outline" className="text-xs">
                          <UserPlus className="h-3 w-3 mr-1" />
                          Will assign
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No workers are available. Please assign workers to this project first.
                </AlertDescription>
              </Alert>
            )}

            {/* Show auto-assignment notice */}
            {selectedWorker && !selectedWorker.is_assigned && (
              <Alert>
                <UserPlus className="h-4 w-4" />
                <AlertDescription>
                  <strong>{selectedWorker.full_name}</strong> will be automatically assigned to this project.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => 
                setFormData(prev => ({ ...prev, priority: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.dueDate ? format(formData.dueDate, "PPP") : "Select date..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.dueDate}
                  onSelect={(date) => setFormData(prev => ({ ...prev, dueDate: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </form>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={createTaskMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.title.trim() || !formData.assigneeId || createTaskMutation.isPending}
          >
            {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}