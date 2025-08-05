import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { logger } from '@/utils/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProjects, Project } from '@/hooks/useProjects';
import { ProjectDrawer } from '@/components/admin/ProjectDrawer';
import { DeleteProjectDialog } from '@/components/admin/DeleteProjectDialog';
import { ProjectCard } from '@/components/admin/ProjectCard';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { NetworkStatus } from '@/components/ui/network-status';
import { useIsMobile } from '@/hooks/use-mobile';




export function AdminProjects() {
  logger.debug('AdminProjects component rendering...');
  const isMobile = useIsMobile();
  
  const { data: projects = [], isLoading } = useProjects();
  logger.debug('useProjects hook called, data:', { projects, isLoading });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setDrawerOpen(true);
  };

  const handleDelete = (project: Project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedProject(null);
  };

  // Filter projects based on search query
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (project.location && project.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <NetworkStatus />
      
      {/* Page Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 data-testid="admin-projects-header" className="text-3xl font-bold text-foreground">
            Projects
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage and monitor all your projects in one place.
          </p>
        </div>
        {!isMobile && (
          <Button
            data-testid="new-project-button"
            onClick={() => setDrawerOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground text-lg mb-2">
            {searchQuery ? 'No projects found' : 'No projects yet'}
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery 
              ? 'Try adjusting your search terms'
              : 'Create your first project to get started'
            }
          </p>
          {!searchQuery && (
            <Button onClick={() => setDrawerOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Project Drawer */}
      <ProjectDrawer
        isOpen={drawerOpen}
        onClose={handleDrawerClose}
        project={selectedProject}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteProjectDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setProjectToDelete(null);
        }}
        project={projectToDelete}
      />

      {/* Mobile FAB */}
      {isMobile && (
        <FloatingActionButton 
          icon={Plus}
          onClick={() => setDrawerOpen(true)}
          label="Add Project"
        />
      )}
    </div>
  );
}