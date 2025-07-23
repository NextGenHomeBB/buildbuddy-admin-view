
import { TrendingUp, Calendar, MapPin, Clock, Users, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Overall Progress Card */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-200 opacity-60" />
        <CardContent className="relative p-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Overall Progress</p>
              <p className="text-3xl font-bold text-foreground">{project.progress.toFixed(0)}%</p>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={project.progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {completedPhases} of {phases.length} phases complete
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Progress Card */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 opacity-60" />
        <CardContent className="relative p-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Tasks</p>
              <p className="text-3xl font-bold text-foreground">{completedTasks}/{totalTasks}</p>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={taskProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {inProgressTasks} in progress
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Budget Card */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200 opacity-60" />
        <CardContent className="relative p-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Budget</p>
              <p className="text-3xl font-bold text-foreground">
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
      </Card>

      {/* Issues Card */}
      <Card className="relative overflow-hidden">
        <div className={`absolute inset-0 ${overdueTasks > 0 ? 'bg-gradient-to-br from-red-50 via-red-100 to-red-200' : 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200'} opacity-60`} />
        <CardContent className="relative p-6">
          <div className="flex items-center gap-4">
            <div className={`flex-shrink-0 w-12 h-12 ${overdueTasks > 0 ? 'bg-red-500' : 'bg-gray-500'} rounded-xl flex items-center justify-center shadow-lg`}>
              {overdueTasks > 0 ? (
                <AlertCircle className="h-6 w-6 text-white" />
              ) : (
                <CheckCircle className="h-6 w-6 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Issues</p>
              <p className={`text-3xl font-bold ${overdueTasks > 0 ? 'text-red-600' : 'text-foreground'}`}>
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
      </Card>
    </div>
  );
}
