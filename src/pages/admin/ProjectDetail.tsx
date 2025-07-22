import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, DollarSign, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useProject } from '@/hooks/useProjects';
import { PhaseTimelineCard } from '@/components/admin/PhaseTimelineCard';

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'in_progress':
      return 'default';
    case 'completed':
      return 'secondary';
    case 'on_hold':
      return 'destructive';
    case 'planning':
      return 'outline';
    default:
      return 'outline';
  }
};

const getPriorityBadgeVariant = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'destructive';
    case 'high':
      return 'destructive';
    case 'medium':
      return 'default';
    case 'low':
      return 'secondary';
    default:
      return 'outline';
  }
};

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading } = useProject(id!);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-foreground">Project Not Found</h2>
        <p className="text-muted-foreground mt-2">The project you're looking for doesn't exist.</p>
        <Link to="/admin/projects">
          <Button className="mt-4">Back to Projects</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center gap-4">
          <Link to="/admin/projects">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
            <p className="text-muted-foreground">{project.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusBadgeVariant(project.status)} className="capitalize">
            {project.status.replace('_', ' ')}
          </Badge>
          <Badge variant={getPriorityBadgeVariant(project.priority)} className="capitalize">
            {project.priority}
          </Badge>
        </div>
      </div>

      {/* Project Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="admin-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Start Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-admin-primary" />
              <span className="text-lg font-semibold">
                {new Date(project.start_date).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {project.end_date && (
          <Card className="admin-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">End Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-admin-primary" />
                <span className="text-lg font-semibold">
                  {new Date(project.end_date).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {project.budget && (
          <Card className="admin-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-admin-primary" />
                <span className="text-lg font-semibold">
                  ${project.budget.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      {/* Project Phases */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Project Phases</h2>
          <Button variant="outline" size="sm">
            Add Phase
          </Button>
        </div>
        
        <div className="grid gap-4">
          {project.project_phases?.map((phase) => (
            <PhaseTimelineCard key={phase.id} phase={phase} />
          ))}
          {(!project.project_phases || project.project_phases.length === 0) && (
            <Card className="admin-card">
              <CardContent className="text-center py-8">
                <p className="text-admin-muted-foreground">No phases found for this project.</p>
                <Button variant="outline" className="mt-4">
                  Add First Phase
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}