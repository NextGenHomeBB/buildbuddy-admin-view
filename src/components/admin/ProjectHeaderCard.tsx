
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
            <div className="bg-background/60 rounded-lg p-4 border">
              <BudgetProgressBar 
                budget={project.budget || 0}
                actual={project.budget ? project.budget * (project.progress / 100) : 0}
                progress={project.progress}
              />
            </div>

            {/* Project Workers Section */}
            <div className="bg-background/60 rounded-lg p-4 border">
              <ProjectWorkersSection projectId={project.id} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
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
