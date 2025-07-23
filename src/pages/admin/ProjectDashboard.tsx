
import { useParams } from 'react-router-dom';
import { useProject } from '@/hooks/useProjects';
import { usePhases } from '@/hooks/usePhases';
import { useTasks } from '@/hooks/useTasks';
import { 
  ProjectMetricsCards, 
  ProjectKeyDates, 
  ProjectStatusSummary, 
  ProjectTimeline 
} from '@/components/admin/overview';

interface ProjectDashboardProps {
  project?: any;
}

export function ProjectDashboard({ project: projectProp }: ProjectDashboardProps) {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading: projectLoading } = useProject(id!);
  const { data: phases = [], isLoading: phasesLoading } = usePhases(id!);
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(id!);

  const currentProject = projectProp || project;

  if (projectLoading || phasesLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  // Calculate metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'done').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
  const overdueTasks = 0; // Tasks don't have end_date, so we'll set this to 0 for now

  return (
    <div className="space-y-8">
      {/* Project Metrics Cards */}
      <ProjectMetricsCards 
        project={currentProject}
        phases={phases}
        totalTasks={totalTasks}
        completedTasks={completedTasks}
        inProgressTasks={inProgressTasks}
        overdueTasks={overdueTasks}
      />

      {/* Key Dates and Status Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectKeyDates 
          project={currentProject}
          phases={phases}
        />
        <ProjectStatusSummary 
          project={currentProject}
          phases={phases}
        />
      </div>

      {/* Project Timeline */}
      <ProjectTimeline phases={phases} />
    </div>
  );
}
