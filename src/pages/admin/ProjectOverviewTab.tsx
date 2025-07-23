
import { Calendar, DollarSign, Users, TrendingUp, Clock, CheckCircle } from 'lucide-react';
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

  // Calculate latest phase
  const latestPhase = phases.find(phase => phase.status === 'in_progress') || 
                     phases[phases.length - 1];

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="bg-card rounded-lg p-6 border">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{project.name}</h2>
            <p className="text-muted-foreground mt-1">{project.location}</p>
          </div>
          <Badge 
            variant={project.status === 'active' ? 'default' : 'secondary'}
            className="capitalize"
          >
            {project.status.replace('_', ' ')}
          </Badge>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{Math.round(project.progress || 0)}%</div>
            <div className="text-sm text-muted-foreground">Overall Progress</div>
            <Progress value={project.progress || 0} className="mt-2 h-2" />
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{completedPhases}/{totalPhases}</div>
            <div className="text-sm text-muted-foreground">Phases Complete</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {project.budget ? `€${project.budget.toLocaleString()}` : 'N/A'}
            </div>
            <div className="text-sm text-muted-foreground">Budget</div>
          </div>
        </div>
      </div>

      {/* Key Dates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Key Dates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Project Start</div>
              <div className="flex items-center gap-2">
                <div className="text-foreground">
                  {project.start_date ? new Date(project.start_date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  }) : 'Not set'}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Expected Finish</div>
              <div className="flex items-center gap-2">
                <div className="text-foreground">31 Jul 2025</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Latest Phase</div>
              <div className="flex items-center gap-2">
                <div className="text-foreground">
                  {latestPhase ? latestPhase.name : 'No phases'}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>Jul 18 - Jul 31, 2025</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>18 Jul</span>
              <span>31 Jul</span>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-between">
                <div className="bg-primary h-3 w-3 rounded-full"></div>
                <div className="bg-primary h-3 w-3 rounded-full opacity-50"></div>
              </div>
            </div>
            <Progress value={75} className="h-2" />
          </div>
        </CardContent>
      </Card>

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

      {/* Phase Progress Details */}
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
  );
}
