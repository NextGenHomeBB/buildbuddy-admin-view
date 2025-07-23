
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Plus, DollarSign, Users, CheckCircle, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { usePhases } from '@/hooks/usePhases';
import { useTasks } from '@/hooks/useTasks';
import { TaskDrawer } from '@/components/admin/TaskDrawer';

interface PhaseDetailTabProps {
  phaseId: string;
  projectId: string;
}

export function PhaseDetailTab({ phaseId, projectId }: PhaseDetailTabProps) {
  const { data: phases = [] } = usePhases(projectId);
  const { data: tasks = [] } = useTasks(projectId);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  
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

  return (
    <div className="space-y-6">
      {/* Phase Header */}
      <div className="bg-card rounded-lg p-6 border">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{phase.name}</h2>
            <p className="text-muted-foreground mt-1">{phase.description}</p>
          </div>
          <Badge 
            variant={
              phase.status === 'completed' ? 'secondary' :
              phase.status === 'in_progress' ? 'default' :
              phase.status === 'blocked' ? 'destructive' : 'outline'
            }
            className="capitalize"
          >
            {phase.status.replace('_', ' ')}
          </Badge>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{Math.round(progress)}%</div>
            <div className="text-sm text-muted-foreground">Progress</div>
            <Progress value={progress} className="mt-2 h-2" />
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{completedTasks}/{totalTasks}</div>
            <div className="text-sm text-muted-foreground">Tasks Complete</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {phase.start_date ? new Date(phase.start_date).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short'
              }) : 'No date'}
            </div>
            <div className="text-sm text-muted-foreground">Start Date</div>
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
                    <div key={task.id} className="flex items-center space-x-3 p-3 rounded-lg border">
                      <Checkbox 
                        checked={task.status === 'done'}
                        className="h-5 w-5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                            {task.title}
                          </span>
                          <Badge variant={
                            task.priority === 'high' ? 'destructive' :
                            task.priority === 'medium' ? 'default' : 'secondary'
                          } className="text-xs">
                            {task.priority}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {new Date(task.created_at).toLocaleDateString('en-GB')}
                        </div>
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
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Material Costs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">€0</div>
                <p className="text-sm text-muted-foreground">No materials added</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Labour Costs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">€0</div>
                <p className="text-sm text-muted-foreground">No labour tracked</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Total Costs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">€0</div>
                <p className="text-sm text-muted-foreground">Phase total</p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
              <CardDescription>Detailed cost analysis for this phase</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">Cost tracking will be implemented in future updates.</p>
              </div>
            </CardContent>
          </Card>
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
