import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar, CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useProjects } from '@/hooks/useProjects';
import { supabase } from '@/integrations/supabase/client';

interface Worker {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string;
}

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  workers: Worker[];
  onTaskCreate: (task: {
    title: string;
    description: string;
    priority: string;
    assignee?: string;
    start_date: string;
    duration_days: number;
    project_id?: string;
    phase_id?: string;
    template_task_id?: string;
  }) => void;
}

export function AddTaskDialog({
  open,
  onOpenChange,
  selectedDate,
  workers,
  onTaskCreate
}: AddTaskDialogProps) {
  const { toast } = useToast();
  const { data: projects = [] } = useProjects();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignee: 'unassigned',
    duration_days: 1,
    project_id: 'none',
    phase_id: 'none',
    template_task_id: 'none'
  });

  // Fetch phases for selected project
  const [phases, setPhases] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    const fetchPhasesAndTasks = async () => {
      if (formData.project_id !== 'none') {
        // Fetch phases for selected project
        const { data: phasesData } = await supabase
          .from('project_phases')
          .select('*')
          .eq('project_id', formData.project_id)
          .order('created_at', { ascending: true });
        
        setPhases(phasesData || []);

        if (formData.phase_id !== 'none') {
          // Fetch tasks for selected phase
          const { data: tasksData } = await supabase
            .from('tasks')
            .select('*')
            .eq('phase_id', formData.phase_id)
            .order('created_at', { ascending: true });
          
          setTasks(tasksData || []);
        } else {
          setTasks([]);
        }
      } else {
        setPhases([]);
        setTasks([]);
      }
    };

    fetchPhasesAndTasks();
  }, [formData.project_id, formData.phase_id]);

  // Use phases and tasks directly since they're already filtered by useEffect

  // Auto-populate title and description when template task is selected
  useEffect(() => {
    if (formData.template_task_id !== 'none') {
      const selectedTask = tasks.find(task => task.id === formData.template_task_id);
      if (selectedTask) {
        setFormData(prev => ({
          ...prev,
          title: selectedTask.title,
          description: selectedTask.description || ''
        }));
      }
    }
  }, [formData.template_task_id, tasks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive"
      });
      return;
    }

    onTaskCreate({
      ...formData,
      start_date: format(selectedDate, 'yyyy-MM-dd'),
      assignee: formData.assignee === 'unassigned' ? undefined : formData.assignee,
      project_id: formData.project_id === 'none' ? undefined : formData.project_id,
      phase_id: formData.phase_id === 'none' ? undefined : formData.phase_id,
      template_task_id: formData.template_task_id === 'none' ? undefined : formData.template_task_id
    });

    // Reset form
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      assignee: 'unassigned',
      duration_days: 1,
      project_id: 'none',
      phase_id: 'none',
      template_task_id: 'none'
    });

    onOpenChange(false);
    
    toast({
      title: "Success",
      description: "Task created successfully"
    });
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Reset dependent fields when parent selection changes
      if (field === 'project_id') {
        newData.phase_id = 'none';
        newData.template_task_id = 'none';
        newData.title = '';
        newData.description = '';
      } else if (field === 'phase_id') {
        newData.template_task_id = 'none';
        newData.title = '';
        newData.description = '';
      }
      
      return newData;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Task
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            Scheduled for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Selection */}
          <div className="space-y-2">
            <Label htmlFor="project">Project</Label>
            <Select
              value={formData.project_id}
              onValueChange={(value) => handleInputChange('project_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Project</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Phase Selection */}
          <div className="space-y-2">
            <Label htmlFor="phase">Phase</Label>
            <Select
              value={formData.phase_id}
              onValueChange={(value) => handleInputChange('phase_id', value)}
              disabled={formData.project_id === 'none'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a phase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Phase</SelectItem>
                {phases.map((phase) => (
                  <SelectItem key={phase.id} value={phase.id}>
                    {phase.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Task Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template_task">Task Template (Optional)</Label>
            <Select
              value={formData.template_task_id}
              onValueChange={(value) => handleInputChange('template_task_id', value)}
              disabled={formData.phase_id === 'none'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a task template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Create New Task</SelectItem>
                {tasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter task title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter task description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleInputChange('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={formData.duration_days}
                onChange={(e) => handleInputChange('duration_days', parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignee">Assign to Worker (Optional)</Label>
            <Select
              value={formData.assignee}
              onValueChange={(value) => handleInputChange('assignee', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a worker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {workers.map((worker) => (
                  <SelectItem key={worker.id} value={worker.id}>
                    <div className="flex items-center gap-2">
                      <span>{worker.full_name}</span>
                      <span className="text-xs text-muted-foreground">({worker.role})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}