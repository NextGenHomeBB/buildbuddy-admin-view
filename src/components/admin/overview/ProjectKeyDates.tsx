
import { Calendar, Clock, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Project } from '@/hooks/useProjects';
import { ProjectPhase } from '@/hooks/usePhases';

interface ProjectKeyDatesProps {
  project: Project;
  phases: ProjectPhase[];
}

export function ProjectKeyDates({ project, phases }: ProjectKeyDatesProps) {
  const latestPhase = phases.find(phase => phase.status === 'in_progress') || 
                     phases[phases.length - 1];

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 opacity-40" />
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5" />
          Key Dates
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Project Start</p>
                <p className="text-lg font-semibold text-foreground">
                  {formatDate(project.start_date)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <Target className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expected Finish</p>
                <p className="text-lg font-semibold text-foreground">31 Jul 2025</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Latest Phase</p>
                <p className="text-lg font-semibold text-foreground">
                  {latestPhase ? latestPhase.name : 'No phases'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
