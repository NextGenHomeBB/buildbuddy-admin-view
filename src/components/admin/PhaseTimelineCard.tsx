import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock } from 'lucide-react';
import { ProjectPhase } from '@/types/admin';

const getStatusColor = (status: ProjectPhase['status']) => {
  switch (status) {
    case 'completed':
      return 'bg-admin-success text-admin-success-foreground';
    case 'in_progress':
      return 'bg-admin-primary text-admin-primary-foreground';
    case 'blocked':
      return 'bg-admin-danger text-admin-danger-foreground';
    default:
      return 'bg-admin-muted text-admin-muted-foreground';
  }
};

interface PhaseTimelineCardProps {
  phase: ProjectPhase;
}

export function PhaseTimelineCard({ phase }: PhaseTimelineCardProps) {
  return (
    <Card className="admin-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-admin-foreground">
            {phase.name}
          </CardTitle>
          <Badge className={`capitalize ${getStatusColor(phase.status)}`}>
            {phase.status.replace('_', ' ')}
          </Badge>
        </div>
        {phase.description && (
          <p className="text-sm text-admin-muted-foreground mt-2">
            {phase.description}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-admin-muted-foreground">Progress</span>
            <span className="font-medium text-admin-foreground">{phase.progress}%</span>
          </div>
          <Progress value={phase.progress} className="h-2" />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {phase.start_date && (
            <div className="flex items-center gap-2 text-sm text-admin-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Start: {new Date(phase.start_date).toLocaleDateString()}</span>
            </div>
          )}
          {phase.end_date && (
            <div className="flex items-center gap-2 text-sm text-admin-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Due: {new Date(phase.end_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}