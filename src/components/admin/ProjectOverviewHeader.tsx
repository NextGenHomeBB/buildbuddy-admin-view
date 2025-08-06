import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Calendar, MapPin, DollarSign, TrendingUp } from 'lucide-react';
import { Project } from '@/hooks/useProjects';
import { useProjectCosts } from '@/hooks/useProjectCosts';
import { format } from 'date-fns';

interface ProjectOverviewHeaderProps {
  project: Project;
}

export function ProjectOverviewHeader({ project }: ProjectOverviewHeaderProps) {
  const { data: projectCosts } = useProjectCosts(project.id);

  // Calculate budget progress
  const budgetProgress = projectCosts?.budget 
    ? Math.min((projectCosts.total_committed / projectCosts.budget) * 100, 100)
    : 0;

  // Calculate timeline progress (simplified - could be enhanced with phase dates)
  const timelineProgress = project.progress || 0;

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '€0';
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Get timeline dates
  const startDate = project.start_date ? format(new Date(project.start_date), 'MMM dd') : 'Not set';
  const endDate = 'TBD'; // Project doesn't have end_date, could be calculated from phases

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Progress Card */}
      <Card className="p-4 bg-green-50 border-green-200">
        <div className="flex items-center justify-between mb-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <span className="text-2xl font-bold text-green-700">
            {Math.round(project.progress || 0)}%
          </span>
        </div>
        <p className="text-sm text-green-600 mb-2">Progress</p>
        <Progress 
          value={project.progress || 0} 
          className="h-2"
        />
      </Card>

      {/* Budget Card */}
      <Card className="p-4 bg-orange-50 border-orange-200">
        <div className="flex items-center justify-between mb-2">
          <DollarSign className="h-5 w-5 text-orange-600" />
          <span className="text-lg font-bold text-orange-700">
            {formatCurrency(projectCosts?.total_committed || 0)}
          </span>
        </div>
        <p className="text-sm text-orange-600 mb-1">Budget</p>
        <p className="text-xs text-orange-500 mb-2">
          of {formatCurrency(projectCosts?.budget || 0)}
        </p>
        <Progress 
          value={budgetProgress} 
          className="h-2"
        />
      </Card>

      {/* Timeline Card */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-semibold text-blue-700">
            {Math.round(timelineProgress)}%
          </span>
        </div>
        <p className="text-sm text-blue-600 mb-1">Timeline</p>
        <p className="text-xs text-blue-500">
          {startDate} - {endDate}
        </p>
      </Card>

      {/* Location Card */}
      <Card className="p-4 bg-gray-50 border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <MapPin className="h-5 w-5 text-gray-600" />
          <span className="text-xs text-gray-500">
            📍
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-1">Location</p>
        <p className="text-xs text-gray-500 truncate">
          {project.location || 'Not specified'}
        </p>
      </Card>
    </div>
  );
}