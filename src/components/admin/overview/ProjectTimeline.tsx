
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ProjectPhase } from '@/hooks/usePhases';

interface ProjectTimelineProps {
  phases: ProjectPhase[];
}

export function ProjectTimeline({ phases }: ProjectTimelineProps) {
  if (phases.length === 0) {
    return (
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 opacity-40" />
        <CardHeader className="relative">
          <CardTitle>Project Timeline</CardTitle>
          <CardDescription>No phases available</CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-center py-8">
            <p className="text-muted-foreground">No timeline to display</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="relative">
        <CardTitle>Project Timeline</CardTitle>
        <CardDescription>Phase progression and status overview</CardDescription>
      </CardHeader>
      <CardContent className="relative">
        <div className="space-y-6">
          {phases.map((phase, index) => (
            <div key={phase.id} className="relative">
              <div className="flex items-center gap-4">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium shadow-sm
                  ${phase.status === 'completed' ? 'bg-green-500 text-white' :
                    phase.status === 'in_progress' ? 'bg-blue-500 text-white' :
                    phase.status === 'blocked' ? 'bg-red-500 text-white' :
                    'bg-gray-300 text-gray-600'}
                `}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">{phase.name}</h4>
                      <div className="text-sm text-muted-foreground">
                        {phase.start_date && phase.end_date && (
                          <>
                            {new Date(phase.start_date).toLocaleDateString('en-GB')} - {' '}
                            {new Date(phase.end_date).toLocaleDateString('en-GB')}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right min-w-0">
                      <div className="text-sm font-medium">
                        {Math.round(phase.progress || 0)}%
                      </div>
                      <Progress value={phase.progress || 0} className="w-24 h-2 mt-1" />
                    </div>
                  </div>
                </div>
              </div>
              {index < phases.length - 1 && (
                <div className="absolute left-5 top-10 w-px h-6 bg-border"></div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
