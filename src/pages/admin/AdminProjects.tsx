import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { useProjects, Project } from '@/hooks/useProjects';
import { ProjectDrawer } from '@/components/admin/ProjectDrawer';
import { DeleteProjectDialog } from '@/components/admin/DeleteProjectDialog';


const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'active':
      return 'default';
    case 'completed':
      return 'secondary';
    case 'on_hold':
      return 'destructive';
    case 'cancelled':
      return 'outline';
    case 'planning':
      return 'outline';
    default:
      return 'outline';
  }
};


export function AdminProjects() {
  console.log('AdminProjects component rendering...');
  const navigate = useNavigate();
  console.log('useNavigate hook called');
  
  const { data: projects = [], isLoading } = useProjects();
  console.log('useProjects hook called, data:', { projects, isLoading });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

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

  const columns: ColumnDef<Project>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const project = row.original;
        return (
          <div 
            className="space-y-1 min-w-0 cursor-pointer hover:text-primary transition-colors"
            onClick={() => navigate(`/admin/projects/${project.id}`)}
          >
            <div className="font-semibold text-foreground truncate">{project.name}</div>
            <div className="text-sm text-muted-foreground truncate">
              {project.description || 'No description'}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <Badge variant={getStatusBadgeVariant(status)} className="capitalize">
            {status.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      id: 'phases',
      header: 'Phases',
      cell: ({ row }) => {
        const project = row.original;
        const phaseCount = project.project_phases?.length || 0;
        return (
          <span className="text-sm text-muted-foreground">
            {phaseCount} {phaseCount === 1 ? 'phase' : 'phases'}
          </span>
        );
      },
    },
    {
      accessorKey: 'updated_at',
      header: 'Updated At',
      cell: ({ row }) => {
        const updatedAt = row.getValue('updated_at') as string;
        const createdAt = row.original.created_at;
        const dateToShow = updatedAt || createdAt;
        
        return dateToShow ? (
          <span className="text-sm text-muted-foreground">
            {new Date(dateToShow).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const project = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => navigate(`/admin/projects/${project.id}`)}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleEdit(project)}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleDelete(project)}
                className="gap-2 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 data-testid="admin-projects-header" className="text-3xl font-bold text-foreground">
            Projects
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage and monitor all your projects in one place.
          </p>
        </div>
        <Button
          data-testid="new-project-button"
          onClick={() => setDrawerOpen(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Projects Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={projects}
          searchPlaceholder="Search projects..."
        />
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