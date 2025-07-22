import { Calendar, DollarSign, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PhaseTimeline } from '@/components/admin/PhaseTimeline';
import { usePhases } from '@/hooks/usePhases';
import { Project } from '@/hooks/useProjects';

interface ProjectOverviewTabProps {
  project: Project;
}

export function ProjectOverviewTab({ project }: ProjectOverviewTabProps) {
  const { data: phases = [] } = usePhases(project.id);

  const completedPhases = phases.filter(phase => phase.status === 'completed').length;
  const totalPhases = phases.length;
  const phaseProgress = totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge 
              variant={
                project.status === 'active' ? 'default' :
                project.status === 'completed' ? 'secondary' :
                project.status === 'on_hold' ? 'destructive' : 'outline'
              }
              className="capitalize"
            >
              {project.status.replace('_', ' ')}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{project.progress || 0}%</div>
              <Progress value={project.progress || 0} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">
                {project.budget ? `$${project.budget.toLocaleString()}` : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Phases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{completedPhases}/{totalPhases}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phase Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Phase Timeline</CardTitle>
          <CardDescription>Visual representation of project phases and their progress</CardDescription>
        </CardHeader>
        <CardContent>
          <PhaseTimeline phases={phases} />
        </CardContent>
      </Card>

      {/* Project Information */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.location && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Location</label>
                <p className="text-foreground">{project.location}</p>
              </div>
            )}
            {project.start_date && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-foreground">{new Date(project.start_date).toLocaleDateString()}</p>
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-foreground">{new Date(project.created_at).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phase Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Phase Completion</span>
                <span className="font-medium">{Math.round(phaseProgress)}%</span>
              </div>
              <Progress value={phaseProgress} className="h-2" />
            </div>
            <div className="text-sm text-muted-foreground">
              {completedPhases} of {totalPhases} phases completed
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}