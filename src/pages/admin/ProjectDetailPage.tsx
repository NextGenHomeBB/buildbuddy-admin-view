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
import { useProject } from '@/hooks/useProjects';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { data: project, isLoading } = useProject(id!);
  
  // Get current tab from URL
  const currentPath = location.pathname.split('/').pop();
  const currentTab = ['overview', 'phases', 'tasks', 'files'].includes(currentPath!) 
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
              <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-flex">
                <TabsTrigger value="overview" className="px-6 py-3">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="phases" className="px-6 py-3">
                  Phases
                </TabsTrigger>
                <TabsTrigger value="tasks" className="px-6 py-3">
                  Tasks
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
            <Route path="/" element={<ProjectOverviewTab project={project} />} />
            <Route path="/overview" element={<ProjectOverviewTab project={project} />} />
            <Route path="/phases" element={<ProjectPhasesTab projectId={id!} />} />
            <Route path="/tasks" element={<ProjectTasksTab projectId={id!} />} />
            <Route path="/files" element={<ProjectFilesTab projectId={id!} />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}