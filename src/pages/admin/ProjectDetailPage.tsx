import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Edit, MoreHorizontal, Copy, Archive, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ProjectHeaderCard } from '@/components/admin/ProjectHeaderCard';
import { ProjectOverviewTab } from '@/components/admin/ProjectOverviewTab';
import { ProjectPhasesTab } from '@/components/admin/ProjectPhasesTab';
import { ProjectTasksTab } from '@/components/admin/ProjectTasksTab';
import { ProjectFilesTab } from '@/components/admin/ProjectFilesTab';
import { ProjectCostsTab } from '@/components/admin/costs/ProjectCostsTab';
import { ProjectPeopleTab } from './ProjectPeopleTab';
import { PhaseDetailTab } from './PhaseDetailTab';
import { ProjectDashboard } from './ProjectDashboard';
import { ProjectTimeTracking } from '@/components/admin/ProjectTimeTracking';
import { useProject } from '@/hooks/useProjects';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { data: project, isLoading } = useProject(id!);
  
  // Extract phaseId from URL if present
  const phaseId = location.pathname.includes('/phases/') && 
    location.pathname.split('/phases/')[1] && 
    location.pathname.split('/phases/')[1] !== '' 
    ? location.pathname.split('/phases/')[1] 
    : null;
  
  // Get current tab from URL
  const pathParts = location.pathname.split('/');
  const currentPath = pathParts[pathParts.length - 1];
  const currentTab = ['overview', 'phases', 'tasks', 'people', 'time', 'costs', 'files'].includes(currentPath!) 
    ? currentPath! 
    : 'overview';

  const handleTabChange = (value: string) => {
    navigate(`/admin/projects/${id}/${value}`);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Project Not Found</h2>
          <p className="text-muted-foreground">The project you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/admin/projects')}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  // If we have a phaseId, show the phase detail view
  if (phaseId) {
    return (
      <div className="flex-1 flex flex-col h-full">
        {/* Breadcrumb */}
        <div className="flex-shrink-0 border-b bg-background p-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink 
                  onClick={() => navigate('/admin/projects')}
                  className="cursor-pointer"
                >
                  Projects
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink 
                  onClick={() => navigate(`/admin/projects/${id}`)}
                  className="cursor-pointer"
                >
                  {project.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Phase Detail</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Header */}
        <div className="flex-shrink-0 p-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(`/admin/projects/${id}/phases`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground">Phase Detail</h1>
              <p className="text-muted-foreground mt-1">Manage phase tasks and progress</p>
            </div>
          </div>
        </div>

        {/* Phase Detail Content */}
        <div className="flex-1 overflow-auto p-6">
          <PhaseDetailTab phaseId={phaseId} projectId={id!} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="flex-shrink-0 border-b bg-background p-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink 
                onClick={() => navigate('/admin/projects')}
                className="cursor-pointer"
              >
                Projects
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{project.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0 p-6 space-y-6">
          {/* Project Header */}
          <ProjectHeaderCard project={project} />

          {/* Tabs Navigation */}
          <div className="border-b">
            <Tabs value={currentTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-7 md:w-auto md:inline-flex">
                <TabsTrigger value="overview" className="px-6 py-3">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="phases" className="px-6 py-3">
                  Phases
                </TabsTrigger>
                <TabsTrigger value="tasks" className="px-6 py-3">
                  Tasks
                </TabsTrigger>
                <TabsTrigger value="people" className="px-6 py-3">
                  People
                </TabsTrigger>
                <TabsTrigger value="time" className="px-6 py-3">
                  Time
                </TabsTrigger>
                <TabsTrigger value="costs" className="px-6 py-3">
                  Costs
                </TabsTrigger>
                <TabsTrigger value="files" className="px-6 py-3">
                  Files
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<ProjectDashboard project={project} />} />
            <Route path="/overview" element={<ProjectDashboard project={project} />} />
            <Route path="/phases" element={<ProjectPhasesTab projectId={id!} />} />
            <Route path="/phases/:phaseId" element={<PhaseDetailTab phaseId={phaseId || ""} projectId={id!} />} />
            <Route path="/tasks" element={<ProjectTasksTab projectId={id!} />} />
            <Route path="/people" element={<ProjectPeopleTab projectId={id!} />} />
            <Route path="/time" element={<ProjectTimeTracking projectId={id!} />} />
            <Route path="/costs" element={<ProjectCostsTab projectId={id!} />} />
            <Route path="/files" element={<ProjectFilesTab projectId={id!} />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}