
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Plus, DollarSign, Users, CheckCircle, Circle, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePhases, useUpdatePhase } from '@/hooks/usePhases';
import { useTasks } from '@/hooks/useTasks';
import { TaskDrawer } from '@/components/admin/TaskDrawer';
import { PhaseCostTab } from '@/components/admin/PhaseCostTab';
import { StatusChip } from '@/components/admin/StatusChip';

interface PhaseDetailTabProps {
  phaseId: string;
  projectId: string;
}

export function PhaseDetailTab({ phaseId, projectId }: PhaseDetailTabProps) {
  const { data: phases = [] } = usePhases(projectId);
  const { data: tasks = [] } = useTasks(projectId);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const updatePhase = useUpdatePhase();
  
  const phase = phases.find(p => p.id === phaseId);
  const phaseTasks = tasks.filter(task => task.phase_id === phaseId);
  
  if (!phase) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Phase not found</p>
      </div>
    );
  }

  const completedTasks = phaseTasks.filter(task => task.status === 'done').length;
  const totalTasks = phaseTasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const handleStatusChange = (newStatus: string) => {
    updatePhase.mutate({
      id: phaseId,
      project_id: projectId,
      name: phase.name,
      description: phase.description || '',
      status: newStatus as 'not_started' | 'in_progress' | 'completed' | 'blocked',
      start_date: phase.start_date,
      end_date: phase.end_date
    });
  };

  return (
    <div className="space-y-6">
      {/* Phase Header */}
      <div className="bg-card rounded-lg p-6 border">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{phase.name}</h2>
            <p className="text-muted-foreground mt-1">{phase.description}</p>
          </div>
          <StatusChip 
            status={phase.status} 
            onStatusChange={handleStatusChange}
            disabled={updatePhase.isPending}
            phaseId={phaseId}
          />
        </div>
        
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="text-center p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground">{Math.round(progress)}%</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Progress</div>
            <Progress value={progress} className="mt-2 h-2" />
          </div>
          <div className="text-center p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground">{completedTasks}/{totalTasks}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Tasks Complete</div>
          </div>
          <div className="text-center p-3 sm:p-4 sm:col-span-2 lg:col-span-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="flex flex-col h-auto p-2 hover:bg-muted/50">
                  <div className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                    {phase.start_date ? new Date(phase.start_date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short'
                    }) : 'No date'}
                    <CalendarIcon className="h-4 w-4" />
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Start Date</div>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={phase.start_date ? new Date(phase.start_date) : undefined}
                  onSelect={(date) => {
                    // TODO: Update phase start date
                    console.log('Selected date:', date);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="checklist" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="checklist">Phase Checklist</TabsTrigger>
          <TabsTrigger value="costs">Cost Management</TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Phase Checklist</CardTitle>
                  <CardDescription>Track completion of phase tasks</CardDescription>
                </div>
                <Button onClick={() => setTaskDrawerOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Task
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {phaseTasks.length > 0 ? (
                  phaseTasks.map((task) => (
                    <div key={task.id} className="flex items-start sm:items-center gap-3 p-2 sm:p-3 rounded-lg border min-h-[60px] hover:bg-muted/50 transition-colors">
                      <div 
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 border-green-500 flex items-center justify-center mt-1 sm:mt-0 transition-all ${
                          task.status === 'done' 
                            ? 'bg-green-500 text-white' 
                            : 'bg-transparent hover:bg-green-50'
                        }`}
                      >
                        {task.status === 'done' && (
                          <CheckCircle className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span className={`font-medium text-sm sm:text-base ${task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                            {task.title}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              task.priority === 'high' ? 'destructive' :
                              task.priority === 'medium' ? 'default' : 'secondary'
                            } className="text-xs flex-shrink-0">
                              {task.priority}
                            </Badge>
                            <div className="text-xs sm:text-sm text-muted-foreground sm:ml-auto">
                              {new Date(task.created_at).toLocaleDateString('en-GB')}
                            </div>
                          </div>
                        </div>
                        {task.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No tasks for this phase yet.</p>
                    <Button 
                      onClick={() => setTaskDrawerOpen(true)} 
                      className="mt-4 gap-2"
                      variant="outline"
                    >
                      <Plus className="h-4 w-4" />
                      Add First Task
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <PhaseCostTab phaseId={phaseId} />
        </TabsContent>
      </Tabs>

      {/* Task Drawer */}
      <TaskDrawer
        isOpen={taskDrawerOpen}
        onClose={() => setTaskDrawerOpen(false)}
        projectId={projectId}
        phaseId={phaseId}
      />
    </div>
  );
}
