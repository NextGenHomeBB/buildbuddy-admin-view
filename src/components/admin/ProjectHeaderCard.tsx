
import { Edit, MoreHorizontal, Copy, Archive, Trash2, Calendar, MapPin, TrendingUp, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusChip } from '@/components/admin/StatusChip';
import { BudgetProgressBar } from '@/components/admin/BudgetProgressBar';
import { ProjectWorkersSection } from '@/components/admin/ProjectWorkersSection';
import { MetricCard } from '@/components/admin/MetricCard';
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

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function ProjectHeaderCard({ project }: ProjectHeaderCardProps) {
  const actualBudget = project.budget ? project.budget * (project.progress / 100) : 0;
  const phaseCount = project.project_phases?.length || 0;

  return (
    <div className="space-y-6">
      {/* Project Title Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
                <StatusChip status={project.status} />
              </div>
              
              {project.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{project.location}</span>
                </div>
              )}
              
              {project.description && (
                <p className="text-muted-foreground leading-relaxed max-w-3xl">
                  {project.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit
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

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Progress"
          value={`${project.progress}%`}
          icon={TrendingUp}
          description="Overall completion"
          trend={{
            value: project.progress > 50 ? '+12% this week' : 'On track',
            isPositive: project.progress > 50
          }}
        />
        
        <MetricCard
          title="Budget"
          value={project.budget ? formatCurrency(project.budget) : 'N/A'}
          icon={DollarSign}
          description={`Used: ${formatCurrency(actualBudget)}`}
          trend={{
            value: actualBudget < (project.budget || 0) ? 'Under budget' : 'Over budget',
            isPositive: actualBudget < (project.budget || 0)
          }}
        />
        
        <MetricCard
          title="Timeline"
          value={project.start_date ? new Date(project.start_date).toLocaleDateString() : 'TBD'}
          icon={Calendar}
          description="Start date"
        />
        
        <MetricCard
          title="Phases"
          value={phaseCount.toString()}
          icon={MapPin}
          description={`${phaseCount} total phases`}
        />
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-6">
          <BudgetProgressBar 
            budget={project.budget || 0}
            actual={actualBudget}
            progress={project.progress}
          />
        </CardContent>
      </Card>

      {/* Project Workers */}
      <Card>
        <CardContent className="p-6">
          <ProjectWorkersSection projectId={project.id} />
        </CardContent>
      </Card>
    </div>
  );
}
