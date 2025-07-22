import { ProjectPhase } from '@/hooks/usePhases';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface PhaseTimelineProps {
  phases: ProjectPhase[];
}

const getPhaseStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-success';
    case 'in_progress':
      return 'bg-primary';
    case 'blocked':
      return 'bg-destructive';
    case 'not_started':
    default:
      return 'bg-muted';
  }
};

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
      <div className="flex gap-4 min-w-fit">
        {phases.map((phase, index) => (
          <div key={phase.id} className="flex items-center gap-4">
            <Card className="min-w-64 flex-shrink-0">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{phase.name}</h4>
                      {phase.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {phase.description}
                        </p>
                      )}
                    </div>
                    {getPhaseStatusBadge(phase.status)}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">Progress</span>
                      <span>{Math.round(phase.progress || 0)}%</span>
                    </div>
                    <Progress value={phase.progress || 0} className="h-1.5" />
                  </div>

                  {(phase.start_date || phase.end_date) && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      {phase.start_date && (
                        <div>Start: {new Date(phase.start_date).toLocaleDateString()}</div>
                      )}
                      {phase.end_date && (
                        <div>End: {new Date(phase.end_date).toLocaleDateString()}</div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {index < phases.length - 1 && (
              <div className="flex-shrink-0">
                <div className="w-8 h-px bg-border"></div>
                <div className="w-2 h-2 bg-border rounded-full -mt-px mx-3"></div>
                <div className="w-8 h-px bg-border -mt-px"></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}