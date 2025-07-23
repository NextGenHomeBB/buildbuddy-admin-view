
import { ProjectPhase } from '@/hooks/usePhases';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface PhaseTimelineProps {
  phases: ProjectPhase[];
}

const getPhaseStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge variant="secondary" className="text-xs">Completed</Badge>;
    case 'in_progress':
      return <Badge variant="default" className="text-xs">In Progress</Badge>;
    case 'blocked':
      return <Badge variant="destructive" className="text-xs">Blocked</Badge>;
    case 'not_started':
    default:
      return <Badge variant="outline" className="text-xs">Not Started</Badge>;
  }
};

export function PhaseTimeline({ phases }: PhaseTimelineProps) {
  if (phases.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No phases to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-fit">
        {phases.map((phase, index) => (
          <div key={phase.id} className="flex items-center gap-4">
            <Card className="min-w-72 flex-shrink-0 relative overflow-hidden">
              <div className={`absolute inset-0 opacity-20 ${
                phase.status === 'completed' ? 'bg-gradient-to-br from-green-50 to-green-200' :
                phase.status === 'in_progress' ? 'bg-gradient-to-br from-blue-50 to-blue-200' :
                phase.status === 'blocked' ? 'bg-gradient-to-br from-red-50 to-red-200' :
                'bg-gradient-to-br from-gray-50 to-gray-200'
              }`} />
              <CardContent className="relative p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-base truncate">{phase.name}</h4>
                      {phase.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {phase.description}
                        </p>
                      )}
                    </div>
                    {getPhaseStatusBadge(phase.status)}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Progress</span>
                      <span className="font-semibold">{Math.round(phase.progress || 0)}%</span>
                    </div>
                    <Progress value={phase.progress || 0} className="h-2" />
                  </div>

                  {(phase.start_date || phase.end_date) && (
                    <div className="text-sm text-muted-foreground space-y-1 pt-2 border-t">
                      {phase.start_date && (
                        <div className="flex justify-between">
                          <span>Start:</span>
                          <span>{new Date(phase.start_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {phase.end_date && (
                        <div className="flex justify-between">
                          <span>End:</span>
                          <span>{new Date(phase.end_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {index < phases.length - 1 && (
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-px bg-border"></div>
                <div className="w-3 h-3 bg-primary rounded-full mx-2 shadow-sm"></div>
                <div className="w-8 h-px bg-border"></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
