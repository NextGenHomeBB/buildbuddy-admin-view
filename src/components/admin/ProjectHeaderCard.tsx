
import { Edit, MoreHorizontal, Copy, Archive, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusChip } from '@/components/admin/StatusChip';
import { BudgetProgressBar } from '@/components/admin/BudgetProgressBar';
import { ProjectWorkersSection } from '@/components/admin/ProjectWorkersSection';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Project } from '@/hooks/useProjects';

interface ProjectHeaderCardProps {
  project: Project;
}

export function ProjectHeaderCard({ project }: ProjectHeaderCardProps) {
  const getStatusGradient = (status: string) => {
    switch (status) {
      case 'active':
        return 'from-blue-50 via-blue-100 to-blue-200';
      case 'completed':
        return 'from-green-50 via-green-100 to-green-200';
      case 'on_hold':
        return 'from-red-50 via-red-100 to-red-200';
      case 'cancelled':
        return 'from-gray-50 via-gray-100 to-gray-200';
      case 'planning':
        return 'from-yellow-50 via-yellow-100 to-yellow-200';
      default:
        return 'from-slate-50 via-slate-100 to-slate-200';
    }
  };

  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${getStatusGradient(project.status)} opacity-40`} />
      <CardContent className="relative p-8">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 space-y-6">
            {/* Project Title and Status */}
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
                  {project.name}
                </h1>
                {project.location && (
                  <p className="text-lg text-muted-foreground mt-2">{project.location}</p>
                )}
              </div>
              <div className="flex-shrink-0">
                <StatusChip status={project.status} />
              </div>
            </div>

            {/* Budget Progress Section */}
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <BudgetProgressBar 
                budget={project.budget || 0}
                actual={project.budget ? project.budget * (project.progress / 100) : 0}
                progress={project.progress}
              />
            </div>

            {/* Project Workers Section */}
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <ProjectWorkersSection projectId={project.id} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" className="gap-2 bg-white/80 backdrop-blur-sm">
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white/80 backdrop-blur-sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2">
                  <Copy className="h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <Archive className="h-4 w-4" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-destructive">
                  <Trash2 className="h-4 w-4" />
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
