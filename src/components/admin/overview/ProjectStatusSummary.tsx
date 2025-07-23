
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Project } from '@/hooks/useProjects';
import { ProjectPhase } from '@/hooks/usePhases';

interface ProjectStatusSummaryProps {
  project: Project;
  phases: ProjectPhase[];
}

export function ProjectStatusSummary({ project, phases }: ProjectStatusSummaryProps) {
  const completedPhases = phases.filter(phase => phase.status === 'completed').length;
  const inProgressPhases = phases.filter(phase => phase.status === 'in_progress').length;
  const blockedPhases = phases.filter(phase => phase.status === 'blocked').length;
  const notStartedPhases = phases.filter(phase => phase.status === 'not_started').length;
  
  const phaseProgress = phases.length > 0 ? (completedPhases / phases.length) * 100 : 0;

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200 opacity-40" />
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Project Status</CardTitle>
          <Badge 
            variant={project.status === 'active' ? 'default' : 'secondary'}
            className="capitalize"
          >
            {project.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="relative space-y-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Phase Completion</span>
            <span className="text-sm font-semibold">{Math.round(phaseProgress)}%</span>
          </div>
          <Progress value={phaseProgress} className="h-3" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Completed</span>
              <span className="text-xs font-medium">{completedPhases}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">In Progress</span>
              <span className="text-xs font-medium">{inProgressPhases}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Blocked</span>
              <span className="text-xs font-medium text-red-600">{blockedPhases}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Not Started</span>
              <span className="text-xs font-medium">{notStartedPhases}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
