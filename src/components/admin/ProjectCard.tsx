
import { Calendar, MapPin, DollarSign, TrendingUp, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Project } from '@/hooks/useProjects';
import { useNavigate } from 'react-router-dom';

interface ProjectCardProps {
  project: Project;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'completed':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'on_hold':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'planning':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();

  const handleViewProject = () => {
    navigate(`/admin/projects/${project.id}`);
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-foreground truncate group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              {project.location && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{project.location}</span>
                </div>
              )}
            </div>
            <Badge 
              className={`px-2 py-1 text-xs font-medium border ${getStatusColor(project.status)}`}
            >
              {project.status.replace('_', ' ')}
            </Badge>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-2" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                <span>Budget</span>
              </div>
              <div className="font-semibold text-sm">
                {project.budget ? formatCurrency(project.budget) : 'N/A'}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Start Date</span>
              </div>
              <div className="font-semibold text-sm">
                {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'TBD'}
              </div>
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {project.description}
            </p>
          )}

          {/* Action */}
          <div className="pt-2">
            <Button 
              onClick={handleViewProject}
              className="w-full gap-2 bg-primary hover:bg-primary-hover"
            >
              <Eye className="h-4 w-4" />
              View Project
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
