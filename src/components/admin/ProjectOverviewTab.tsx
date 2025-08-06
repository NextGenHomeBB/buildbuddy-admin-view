
import { usePhases } from '@/hooks/usePhases';
import { useTasks } from '@/hooks/useTasks';
import { Project } from '@/hooks/useProjects';
import { ProjectOverviewHeader } from '@/components/admin/ProjectOverviewHeader';
import { 
  ProjectKeyDates, 
  ProjectStatusSummary, 
  ProjectTimeline 
} from '@/components/admin/overview';

interface ProjectOverviewTabProps {
  project: Project;
}

export function ProjectOverviewTab({ project }: ProjectOverviewTabProps) {
  const { data: phases = [] } = usePhases(project.id);
  const { data: tasks = [] } = useTasks(project.id);

  // Calculate metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'done').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
  const overdueTasks = 0; // Tasks don't have end_date, so we'll set this to 0 for now

  return (
    <div className="space-y-8">
      {/* Project Overview Header */}
      <ProjectOverviewHeader project={project} />

      {/* Key Dates and Status Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectKeyDates 
          project={project}
          phases={phases}
        />
        <ProjectStatusSummary 
          project={project}
          phases={phases}
        />
      </div>

      {/* Project Timeline */}
      <ProjectTimeline phases={phases} />
    </div>
  );
}
