import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, CalendarIcon, Plus, UserPlus, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useProjects } from '@/hooks/useProjects';
import { useWorkersWithProjectAccess } from '@/hooks/useWorkersWithProjectAccess';
import { useAssignWorkerToProject } from '@/hooks/useProjectWorkers';
import { useCreateTaskWithAssignment } from '@/hooks/useCreateTaskWithAssignment';
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
  const { data: workersWithAccess = [], refetch: refetchWorkers } = useWorkersWithProjectAccess();
  const assignWorkerMutation = useAssignWorkerToProject();
  const createTaskWithAssignment = useCreateTaskWithAssignment();
  
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

  const [isAssigningWorker, setIsAssigningWorker] = useState(false);
  const [showWorkerAssignment, setShowWorkerAssignment] = useState(false);

  // Fetch phases for selected project
  const [phases, setPhases] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  // Filter workers based on selected project - use both sources for completeness
  const availableWorkers = useMemo(() => {
    if (formData.project_id === 'none') {
      // If no project selected, show all workers
      return workersWithAccess.map(w => ({
        id: w.id,
        full_name: w.full_name,
        role: w.role,
        avatar_url: w.avatar_url
      }));
    }
    
    // Filter workers who have access to the selected project
    return workersWithAccess
      .filter(worker => {
        // Check user_project_role table
        return worker.project_access.some(access => access.project_id === formData.project_id);
      })
      .map(w => ({
        id: w.id,
        full_name: w.full_name,
        role: w.role,
        avatar_url: w.avatar_url
      }));
  }, [workersWithAccess, formData.project_id, projects]);

  // Get workers without project access for assignment option
  const workersWithoutAccess = useMemo(() => {
    if (formData.project_id === 'none') {
      return [];
    }
    
    return workersWithAccess
      .filter(worker => {
        // Check user_project_role table
        const hasProjectRole = worker.project_access.some(access => access.project_id === formData.project_id);
        return !hasProjectRole;
      })
      .map(w => ({
        id: w.id,
        full_name: w.full_name,
        role: w.role,
        avatar_url: w.avatar_url
      }));
  }, [workersWithAccess, formData.project_id, projects]);

  // Check if selected assignee has project access
  const selectedWorkerHasAccess = useMemo(() => {
    if (formData.assignee === 'unassigned' || formData.project_id === 'none') {
      return true;
    }
    return availableWorkers.some(worker => worker.id === formData.assignee);
  }, [availableWorkers, formData.assignee, formData.project_id]);

  // Get selected worker details
  const selectedWorker = useMemo(() => {
    if (formData.assignee === 'unassigned') return null;
    return workersWithAccess.find(w => w.id === formData.assignee);
  }, [workersWithAccess, formData.assignee]);

  // Get selected project details
  const selectedProject = useMemo(() => {
    if (formData.project_id === 'none') return null;
    return projects.find(p => p.id === formData.project_id);
  }, [projects, formData.project_id]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.project_id || formData.project_id === 'none') {
      toast({
        title: "Error", 
        description: "Please select a project",
        variant: "destructive"
      });
      return;
    }

    if (!formData.assignee || formData.assignee === 'unassigned') {
      toast({
        title: "Error",
        description: "Please select a worker to assign the task to",
        variant: "destructive"
      });
      return;
    }

    try {
      await createTaskWithAssignment.mutateAsync({
        title: formData.title,
        description: formData.description,
        assigneeId: formData.assignee,
        projectId: formData.project_id,
        dueDate: format(selectedDate, 'yyyy-MM-dd'),
        priority: formData.priority
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
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleAssignWorkerToProject = async (workerId: string) => {
    if (!selectedProject) return;
    
    setIsAssigningWorker(true);
    
    try {
      await assignWorkerMutation.mutateAsync({
        projectId: selectedProject.id,
        userId: workerId,
        role: 'worker'
      });
      
      // Refresh workers data
      await refetchWorkers();
      
      // Set the worker as assignee
      setFormData(prev => ({ ...prev, assignee: workerId }));
      setShowWorkerAssignment(false);
      
      toast({
        title: "Worker assigned",
        description: `Worker has been assigned to ${selectedProject.name} and can now be assigned to tasks.`,
      });
    } catch (error) {
      console.error('Failed to assign worker:', error);
      toast({
        title: "Error",
        description: "Failed to assign worker to project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAssigningWorker(false);
    }
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
        setShowWorkerAssignment(false);
        // Reset assignee if they don't have access to the new project
        if (newData.assignee !== 'unassigned') {
          const workerHasAccess = workersWithAccess
            .find(w => w.id === newData.assignee)
            ?.project_access.some(access => access.project_id === value);
          if (!workerHasAccess) {
            newData.assignee = 'unassigned';
          }
        }
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
            <div className="flex items-center justify-between">
              <Label htmlFor="assignee">Assign to Worker (Optional)</Label>
              {formData.project_id !== 'none' && (
                <div className="text-xs text-muted-foreground">
                  {availableWorkers.length} of {workersWithAccess.length} workers available
                </div>
              )}
            </div>
            
            {/* Worker statistics and helper text */}
            {formData.project_id !== 'none' && (
              <div className="text-sm text-muted-foreground mb-2">
                {availableWorkers.length === 0 ? (
                  <span className="text-orange-600">No workers have access to this project</span>
                ) : workersWithoutAccess.length > 0 ? (
                  <span>{workersWithoutAccess.length} additional workers could be assigned to this project</span>
                ) : (
                  <span>All workers have access to this project</span>
                )}
              </div>
            )}
            
            <Select
              value={formData.assignee}
              onValueChange={(value) => handleInputChange('assignee', value)}
            >
              <SelectTrigger className={!selectedWorkerHasAccess ? "border-destructive" : ""}>
                <SelectValue placeholder="Select a worker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {availableWorkers.map((worker) => (
                  <SelectItem key={worker.id} value={worker.id}>
                    <div className="flex items-center gap-2">
                      <span>{worker.full_name}</span>
                      <span className="text-xs text-muted-foreground">({worker.role})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Always show assignment button when there are workers without access */}
            {formData.project_id !== 'none' && workersWithoutAccess.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowWorkerAssignment(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Assign More Workers ({workersWithoutAccess.length})
              </Button>
            )}
            
            {/* Show assignment options for workers without project access */}
            {formData.project_id !== 'none' && availableWorkers.length === 0 && workersWithoutAccess.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No workers have access to this project yet.{' '}
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0"
                    onClick={() => setShowWorkerAssignment(true)}
                  >
                    Assign workers to project
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Show worker assignment section if enabled */}
            {showWorkerAssignment && formData.project_id !== 'none' && workersWithoutAccess.length > 0 && (
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Assign Workers to Project</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowWorkerAssignment(false)}
                  >
                    Cancel
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Assign workers to {selectedProject?.name} to make them available for task assignment.
                </p>
                <div className="space-y-2">
                  {workersWithoutAccess.map((worker) => (
                    <div key={worker.id} className="flex items-center justify-between py-1">
                      <span className="text-sm">{worker.full_name}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isAssigningWorker}
                        onClick={() => handleAssignWorkerToProject(worker.id)}
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        {isAssigningWorker ? 'Assigning...' : 'Assign'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show warning for selected worker without access */}
            {!selectedWorkerHasAccess && formData.assignee !== 'unassigned' && selectedWorker && selectedProject && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{selectedWorker.full_name} doesn't have access to {selectedProject.name}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isAssigningWorker}
                    onClick={() => handleAssignWorkerToProject(selectedWorker.id)}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    {isAssigningWorker ? 'Assigning...' : 'Assign to Project'}
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Show link to project settings if no workers available */}
            {formData.project_id !== 'none' && availableWorkers.length === 0 && workersWithoutAccess.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No workers available for this project.{' '}
                <Button 
                  type="button" 
                  variant="link" 
                  className="h-auto p-0"
                  onClick={() => {
                    toast({
                      title: "Go to project settings",
                      description: "Manage worker assignments in the project settings.",
                    });
                  }}
                >
                  Manage project workers
                </Button>
              </p>
            )}
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