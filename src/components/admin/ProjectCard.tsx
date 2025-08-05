import { useState } from 'react';
import { MoreHorizontal, Eye, Edit, Trash2, MapPin, Calendar, BarChart3 } from 'lucide-react';
import { Project } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on dropdown or buttons
    if ((e.target as HTMLElement).closest('[data-dropdown]') || 
        (e.target as HTMLElement).closest('button')) {
      return;
    }
    navigate(`/admin/projects/${project.id}`);
  };

  const phaseCount = project.project_phases?.length || 0;
  const formattedDate = project.start_date 
    ? new Date(project.start_date).toLocaleDateString()
    : new Date(project.created_at).toLocaleDateString();

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
            <h3 className="font-semibold text-lg text-card-foreground truncate group-hover:text-primary transition-colors">
              {project.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {project.description || 'No description provided'}
            </p>
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
                    navigate(`/admin/projects/${project.id}`);
                  }}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(project);
                  }}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Project
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(project);
                  }}
                  className="gap-2 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-card-foreground">
              {Math.round(project.progress || 0)}%
            </span>
          </div>
          <Progress value={project.progress || 0} className="h-2" />
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            <span>{phaseCount} {phaseCount === 1 ? 'phase' : 'phases'}</span>
          </div>
          {project.budget && (
            <div className="text-muted-foreground">
              ${project.budget.toLocaleString()}
            </div>
          )}
        </div>

        {/* Location and Date */}
        <div className="space-y-2">
          {project.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{project.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>Started {formattedDate}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}