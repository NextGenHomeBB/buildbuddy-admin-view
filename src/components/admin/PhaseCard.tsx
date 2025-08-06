import { useState } from 'react';
import { MoreHorizontal, Edit, Trash2, Calendar, CheckCircle2, Clock, AlertCircle, Pause } from 'lucide-react';
import { ProjectPhase, useUpdatePhase } from '@/hooks/usePhases';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StatusChip } from '@/components/admin/StatusChip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';

interface PhaseCardProps {
  phase: ProjectPhase;
  projectId: string;
  onEdit: (phase: ProjectPhase) => void;
  onDelete: (phase: ProjectPhase) => void;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'in_progress':
      return <Clock className="h-4 w-4 text-blue-600" />;
    case 'blocked':
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    case 'not_started':
      return <Pause className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

export function PhaseCard({ phase, projectId, onEdit, onDelete }: PhaseCardProps) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const updatePhase = useUpdatePhase();

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on dropdown or buttons
    if ((e.target as HTMLElement).closest('[data-dropdown]') || 
        (e.target as HTMLElement).closest('button')) {
      return;
    }
    navigate(`/admin/projects/${projectId}/phases/${phase.id}`);
  };

  const handleStatusChange = (newStatus: string) => {
    updatePhase.mutate({
      id: phase.id,
      name: phase.name,
      status: newStatus as 'not_started' | 'in_progress' | 'completed' | 'blocked',
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card 
      className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-border bg-card"
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(phase.status)}
              <h3 className="font-semibold text-lg text-card-foreground truncate group-hover:text-primary transition-colors">
                {phase.name}
              </h3>
            </div>
            {phase.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {phase.description}
              </p>
            )}
          </div>
          <div data-dropdown>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(phase);
                  }}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Phase
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(phase);
                  }}
                  className="gap-2 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Phase
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status and Progress Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <StatusChip 
              status={phase.status} 
              onStatusChange={handleStatusChange}
              disabled={updatePhase.isPending}
              phaseId={phase.id}
            />
            <span className="text-sm font-medium text-card-foreground">
              {Math.round(phase.progress || 0)}%
            </span>
          </div>
          <Progress value={phase.progress || 0} className="h-2" />
        </div>

        {/* Dates Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Start: {formatDate(phase.start_date)}</span>
          </div>
          {phase.end_date && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">End: {formatDate(phase.end_date)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
