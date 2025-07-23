import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, DollarSign, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useProject } from '@/hooks/useProjects';
import { usePhases } from '@/hooks/usePhases';
import { useTasks } from '@/hooks/useTasks';

interface ProjectDashboardProps {
  project?: any;
}

export function ProjectDashboard({ project: projectProp }: ProjectDashboardProps) {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading: projectLoading } = useProject(id!);
  const { data: phases = [], isLoading: phasesLoading } = usePhases(id!);
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(id!);

  const currentProject = projectProp || project;

  if (projectLoading || phasesLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  // Calculate metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'done').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
  const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const activePhases = phases.filter(phase => phase.status === 'in_progress').length;
  const completedPhases = phases.filter(phase => phase.status === 'completed').length;
  const phaseProgress = phases.length > 0 ? (completedPhases / phases.length) * 100 : 0;

  const overdueTasks = 0; // Tasks don't have end_date, so we'll set this to 0 for now

  return (
    <div className="space-y-6">
      {/* Project Overview Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Progress</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(currentProject.progress || 0)}%</div>
            <Progress value={currentProject.progress || 0} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {completedPhases} of {phases.length} phases complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks}/{totalTasks}</div>
            <Progress value={taskProgress} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {inProgressTasks} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{currentProject.budget?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total allocated budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueTasks}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Overdue tasks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Phase Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Phase Status</CardTitle>
            <CardDescription>Current status of all project phases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {phases.length > 0 ? (
                phases.map((phase) => (
                  <div key={phase.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {phase.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {phase.start_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(phase.start_date).toLocaleDateString('en-GB')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-muted-foreground">
                        {Math.round(phase.progress || 0)}%
                      </div>
                      <Badge 
                        variant={
                          phase.status === 'completed' ? 'secondary' :
                          phase.status === 'in_progress' ? 'default' :
                          phase.status === 'blocked' ? 'destructive' : 'outline'
                        }
                        className="capitalize"
                      >
                        {phase.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No phases created yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
            <CardDescription>Latest task activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks.slice(0, 5).length > 0 ? (
                tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {task.title}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(task.created_at).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          task.priority === 'high' ? 'destructive' :
                          task.priority === 'medium' ? 'default' : 'secondary'
                        }
                        className="text-xs"
                      >
                        {task.priority}
                      </Badge>
                      <Badge 
                        variant={
                          task.status === 'done' ? 'secondary' :
                          task.status === 'in_progress' ? 'default' : 'outline'
                        }
                        className="capitalize text-xs"
                      >
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No tasks created yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Project Timeline</CardTitle>
          <CardDescription>Visual overview of project phases</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {phases.length > 0 ? (
              phases.map((phase, index) => (
                <div key={phase.id} className="relative">
                  <div className="flex items-center gap-4">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                      ${phase.status === 'completed' ? 'bg-secondary text-secondary-foreground' :
                        phase.status === 'in_progress' ? 'bg-primary text-primary-foreground' :
                        phase.status === 'blocked' ? 'bg-destructive text-destructive-foreground' :
                        'bg-muted text-muted-foreground'}
                    `}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{phase.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {phase.start_date && phase.end_date && (
                          <>
                            {new Date(phase.start_date).toLocaleDateString('en-GB')} - {' '}
                            {new Date(phase.end_date).toLocaleDateString('en-GB')}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {Math.round(phase.progress || 0)}%
                      </div>
                      <Progress value={phase.progress || 0} className="w-20 h-2" />
                    </div>
                  </div>
                  {index < phases.length - 1 && (
                    <div className="absolute left-4 top-8 w-px h-4 bg-border"></div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No project timeline available
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}