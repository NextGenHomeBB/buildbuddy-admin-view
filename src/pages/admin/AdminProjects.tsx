
import { useState, useMemo } from 'react';
import { useProjects, Project } from '@/hooks/useProjects';
import { ProjectCard } from '@/components/admin/ProjectCard';
import { ProjectsHeader } from '@/components/admin/ProjectsHeader';
import { ProjectDrawer } from '@/components/admin/ProjectDrawer';
import { DeleteProjectDialog } from '@/components/admin/DeleteProjectDialog';

export function AdminProjects() {
  console.log('AdminProjects component rendering...');
  
  const { data: projects = [], isLoading } = useProjects();
  console.log('useProjects hook called, data:', { projects, isLoading });
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter projects based on search and status
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           project.location?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

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

  const handleNewProject = () => {
    setSelectedProject(null);
    setDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <ProjectsHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onNewProject={handleNewProject}
      />

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            {searchQuery || statusFilter !== 'all' ? 
              'No projects found matching your criteria.' : 
              'No projects yet. Create your first project to get started.'
            }
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
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
    </div>
  );
}
