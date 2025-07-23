import { Calendar, MapPin, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-2xl font-bold text-foreground">{project.progress.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-construction-accent/10 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-construction-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="text-lg font-semibold text-foreground truncate">
                  {formatDate(project.start_date)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-construction-warning/10 rounded-lg flex items-center justify-center">
                <MapPin className="h-5 w-5 text-construction-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="text-lg font-semibold text-foreground truncate">
                  {project.location || 'Not specified'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-construction-secondary/10 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-construction-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="text-lg font-semibold text-foreground truncate">
                  {formatDate(project.updated_at || project.created_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Project Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">{project.progress.toFixed(0)}%</span>
              </div>
              <Progress value={project.progress} className="h-3" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phases Completed</span>
                <span className="font-medium">{completedPhases} of {totalPhases}</span>
              </div>
              <Progress value={phaseProgress} className="h-3" />
            </div>

            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Budget</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(project.budget)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project Information */}
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-sm text-foreground mt-1">
                  {project.description || 'No description provided'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-sm font-medium text-foreground mt-1 capitalize">
                  {project.status.replace('_', ' ')}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm text-foreground mt-1">
                  {formatDate(project.created_at)}
                </p>
              </div>

              {project.start_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="text-sm text-foreground mt-1">
                    {formatDate(project.start_date)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent activity to display</p>
            <p className="text-sm mt-1">Activity tracking coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}