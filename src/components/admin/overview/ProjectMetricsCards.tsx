
import { TrendingUp, Calendar, MapPin, Clock, Users, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TouchCard } from '@/components/ui/touch-card';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Project } from '@/hooks/useProjects';
import { ProjectPhase } from '@/hooks/usePhases';

interface ProjectMetricsCardsProps {
  project: Project;
  phases: ProjectPhase[];
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
}

export function ProjectMetricsCards({ 
  project, 
  phases, 
  totalTasks, 
  completedTasks, 
  inProgressTasks, 
  overdueTasks 
}: ProjectMetricsCardsProps) {
  const isMobile = useIsMobile();
  const completedPhases = phases.filter(phase => phase.status === 'completed').length;
  const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const phaseProgress = phases.length > 0 ? (completedPhases / phases.length) * 100 : 0;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '€0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const CardWrapper = isMobile ? TouchCard : Card;

  return (
    <div className={cn(
      "grid gap-6",
      isMobile 
        ? "grid-cols-1 sm:grid-cols-2" 
        : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
    )}>
      {/* Overall Progress Card */}
      <CardWrapper className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-200 opacity-60" />
        <CardContent className={cn("relative", isMobile ? "p-4" : "p-6")}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "flex-shrink-0 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg",
              isMobile ? "w-10 h-10" : "w-12 h-12"
            )}>
              <TrendingUp className={cn("text-white", isMobile ? "h-5 w-5" : "h-6 w-6")} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Overall Progress</p>
              <p className={cn("font-bold text-foreground", isMobile ? "text-2xl" : "text-3xl")}>
                {project.progress.toFixed(0)}%
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={project.progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {completedPhases} of {phases.length} phases complete
            </p>
          </div>
        </CardContent>
      </CardWrapper>

      {/* Tasks Progress Card */}
      <CardWrapper className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 opacity-60" />
        <CardContent className={cn("relative", isMobile ? "p-4" : "p-6")}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "flex-shrink-0 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg",
              isMobile ? "w-10 h-10" : "w-12 h-12"
            )}>
              <Users className={cn("text-white", isMobile ? "h-5 w-5" : "h-6 w-6")} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Tasks</p>
              <p className={cn("font-bold text-foreground", isMobile ? "text-2xl" : "text-3xl")}>
                {completedTasks}/{totalTasks}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={taskProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {inProgressTasks} in progress
            </p>
          </div>
        </CardContent>
      </CardWrapper>

      {/* Budget Card */}
      <CardWrapper className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200 opacity-60" />
        <CardContent className={cn("relative", isMobile ? "p-4" : "p-6")}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "flex-shrink-0 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg",
              isMobile ? "w-10 h-10" : "w-12 h-12"
            )}>
              <DollarSign className={cn("text-white", isMobile ? "h-5 w-5" : "h-6 w-6")} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Budget</p>
              <p className={cn("font-bold text-foreground", isMobile ? "text-xl" : "text-3xl")}>
                {formatCurrency(project.budget)}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-muted-foreground">
              Total allocated budget
            </p>
          </div>
        </CardContent>
      </CardWrapper>

      {/* Issues Card */}
      <CardWrapper className="relative overflow-hidden">
        <div className={cn(
          "absolute inset-0 opacity-60",
          overdueTasks > 0 
            ? "bg-gradient-to-br from-red-50 via-red-100 to-red-200" 
            : "bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200"
        )} />
        <CardContent className={cn("relative", isMobile ? "p-4" : "p-6")}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "flex-shrink-0 rounded-xl flex items-center justify-center shadow-lg",
              isMobile ? "w-10 h-10" : "w-12 h-12",
              overdueTasks > 0 ? "bg-red-500" : "bg-gray-500"
            )}>
              {overdueTasks > 0 ? (
                <AlertCircle className={cn("text-white", isMobile ? "h-5 w-5" : "h-6 w-6")} />
              ) : (
                <CheckCircle className={cn("text-white", isMobile ? "h-5 w-5" : "h-6 w-6")} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Issues</p>
              <p className={cn(
                "font-bold",
                isMobile ? "text-2xl" : "text-3xl",
                overdueTasks > 0 ? "text-red-600" : "text-foreground"
              )}>
                {overdueTasks}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-muted-foreground">
              {overdueTasks > 0 ? 'Overdue tasks' : 'No issues found'}
            </p>
          </div>
        </CardContent>
      </CardWrapper>
    </div>
  );
}
