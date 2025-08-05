
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

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="relative p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-6">
          <div className="flex-1 space-y-4 sm:space-y-6">
            {/* Project Title and Status */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                  {project.name}
                </h1>
                {project.location && (
                  <p className="text-base sm:text-lg text-muted-foreground mt-1 sm:mt-2">{project.location}</p>
                )}
              </div>
              <div className="flex-shrink-0 self-start">
                <StatusChip status={project.status} />
              </div>
            </div>

            {/* Budget Progress Section */}
            <div className="bg-background/60 rounded-lg p-3 sm:p-4 border">
              <BudgetProgressBar 
                budget={project.budget || 0}
                actual={project.budget ? project.budget * (project.progress / 100) : 0}
                progress={project.progress}
              />
            </div>

            {/* Project Workers Section */}
            <div className="bg-background/60 rounded-lg p-3 sm:p-4 border">
              <ProjectWorkersSection projectId={project.id} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex lg:flex-col items-center justify-end lg:justify-start gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" className="gap-2 min-h-[44px] sm:min-h-auto">
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-auto">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50 bg-background border shadow-lg">
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
