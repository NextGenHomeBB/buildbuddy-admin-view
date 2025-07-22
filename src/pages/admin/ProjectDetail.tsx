import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  Users, 
  Edit, 
  MoreHorizontal,
  CheckCircle,
  Clock,
  AlertCircle,
  Circle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mockProjects, mockProjectPhases } from '@/lib/mockData';

const getPhaseStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-5 w-5 text-success" />;
    case 'in_progress':
      return <Clock className="h-5 w-5 text-primary" />;
    case 'blocked':
      return <AlertCircle className="h-5 w-5 text-destructive" />;
    case 'not_started':
    default:
      return <Circle className="h-5 w-5 text-muted-foreground" />;
  }
};

const getPhaseStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge variant="secondary">Completed</Badge>;
    case 'in_progress':
      return <Badge variant="default">In Progress</Badge>;
    case 'blocked':
      return <Badge variant="destructive">Blocked</Badge>;
    case 'not_started':
    default:
      return <Badge variant="outline">Not Started</Badge>;
  }
};

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const project = mockProjects.find(p => p.id === id);
  const phases = mockProjectPhases[id!] || [];

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-foreground mb-2">Project Not Found</h2>
        <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/admin/projects')}>
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/admin/projects')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
          <p className="text-muted-foreground mt-1">{project.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Edit className="h-4 w-4" />
            Edit Project
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Archive Project</DropdownMenuItem>
              <DropdownMenuItem>Export Data</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Project Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="admin-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge 
              variant={
                project.status === 'active' ? 'default' :
                project.status === 'completed' ? 'secondary' :
                project.status === 'on_hold' ? 'destructive' : 'outline'
              }
              className="capitalize"
            >
              {project.status.replace('_', ' ')}
            </Badge>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{project.completion_percentage}%</div>
              <Progress value={project.completion_percentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{project.team_size}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">
                {project.budget ? `$${project.budget.toLocaleString()}` : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Details */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Project Phases */}
          <Card className="admin-card">
            <CardHeader>
              <CardTitle>Project Phases</CardTitle>
              <CardDescription>Timeline and progress of project phases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {phases.map((phase) => (
                  <div key={phase.id} className="flex items-start gap-4 p-4 rounded-lg border border-border">
                    <div className="mt-1">
                      {getPhaseStatusIcon(phase.status)}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-foreground">{phase.name}</h4>
                        {getPhaseStatusBadge(phase.status)}
                      </div>
                      {phase.description && (
                        <p className="text-sm text-muted-foreground">{phase.description}</p>
                      )}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{phase.completion_percentage}%</span>
                        </div>
                        <Progress value={phase.completion_percentage} className="h-1.5" />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(phase.start_date).toLocaleDateString()}
                        </div>
                        {phase.end_date && (
                          <>
                            <span>→</span>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(phase.end_date).toLocaleDateString()}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          {/* Project Info */}
          <Card className="admin-card">
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Client</label>
                <p className="text-foreground">{project.client_name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Priority</label>
                <div className="mt-1">
                  <Badge 
                    variant={
                      project.priority === 'critical' || project.priority === 'high' ? 'destructive' :
                      project.priority === 'medium' ? 'default' : 'secondary'
                    }
                    className="capitalize"
                  >
                    {project.priority}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                <p className="text-foreground">{new Date(project.start_date).toLocaleDateString()}</p>
              </div>
              {project.end_date && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">End Date</label>
                  <p className="text-foreground">{new Date(project.end_date).toLocaleDateString()}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p className="text-foreground">{new Date(project.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="text-foreground">{new Date(project.updated_at).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}