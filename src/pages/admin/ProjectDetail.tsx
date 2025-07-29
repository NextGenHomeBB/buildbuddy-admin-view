import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  Users, 
  Edit, 
  MoreHorizontal,
  CheckCircle,
  Clock,
  AlertCircle,
  Circle,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/admin/DataTable';
import { supabase } from '@/integrations/supabase/client';
import { useBulkPhaseUpdate } from '@/hooks/useBulkPhaseUpdate';
import { logger } from '@/utils/logger';

const getPhaseStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-5 w-5 text-success" />;
    case 'in_progress':
      return <Clock className="h-5 w-5 text-primary" />;
    case 'blocked':
      return <AlertCircle className="h-5 w-5 text-destructive" />;
    case 'not_started':
    default:
      return <Circle className="h-5 w-5 text-muted-foreground" />;
  }
};

const getPhaseStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge variant="secondary">Completed</Badge>;
    case 'in_progress':
      return <Badge variant="default">In Progress</Badge>;
    case 'blocked':
      return <Badge variant="destructive">Blocked</Badge>;
    case 'not_started':
    default:
      return <Badge variant="outline">Not Started</Badge>;
  }
};

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [phases, setPhases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhases, setSelectedPhases] = useState<Record<string, boolean>>({});
  
  const bulkPhaseUpdate = useBulkPhaseUpdate();

  useEffect(() => {
    const fetchProject = async () => {
      if (!id) return;

      try {
        logger.info('Fetching project with ID:', id);
        
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (projectError) {
          console.error('Error fetching project:', projectError);
          setLoading(false);
          return;
        }

        logger.info('Project data:', projectData);
        setProject(projectData);

        // Fetch project phases
        const { data: phasesData, error: phasesError } = await supabase
          .from('project_phases')
          .select('*')
          .eq('project_id', id);

        if (phasesError) {
          console.error('Error fetching phases:', phasesError);
        } else {
          setPhases(phasesData || []);
        }

      } catch (error) {
        console.error('Error in fetchProject:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id]);

  // Get selected phase IDs
  const selectedPhaseIds = Object.keys(selectedPhases).filter(id => selectedPhases[id]);
  const hasSelectedPhases = selectedPhaseIds.length > 0;

  // Handle bulk update
  const handleMarkComplete = async () => {
    if (!id || selectedPhaseIds.length === 0) return;
    
    await bulkPhaseUpdate.mutateAsync({
      projectId: id,
      phaseIds: selectedPhaseIds,
      status: 'completed'
    });
    
    // Clear selection after successful update
    setSelectedPhases({});
  };

  // Define columns for the phases table
  const phaseColumns: ColumnDef<any>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: 'Phase Name',
      cell: ({ row }) => {
        const phase = row.original;
        return (
          <div className="flex items-start gap-3">
            <div className="mt-1">
              {getPhaseStatusIcon(phase.status)}
            </div>
            <div>
              <div className="font-semibold text-foreground">{phase.name}</div>
              {phase.description && (
                <p className="text-sm text-muted-foreground mt-1">{phase.description}</p>
              )}
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
        return getPhaseStatusBadge(status);
      },
    },
    {
      accessorKey: 'progress',
      header: 'Progress',
      cell: ({ row }) => {
        const progress = row.getValue('progress') as number || 0;
        return (
          <div className="space-y-2 min-w-24">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        );
      },
    },
    {
      accessorKey: 'start_date',
      header: 'Start Date',
      cell: ({ row }) => {
        const startDate = row.getValue('start_date') as string;
        return startDate ? (
          <div className="flex items-center gap-1 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {new Date(startDate).toLocaleDateString()}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: 'end_date',
      header: 'End Date',
      cell: ({ row }) => {
        const endDate = row.getValue('end_date') as string;
        return endDate ? (
          <div className="flex items-center gap-1 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {new Date(endDate).toLocaleDateString()}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-foreground mb-2">Project Not Found</h2>
        <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/admin/projects')}>
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/admin/projects')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
          <p className="text-muted-foreground mt-1">{project.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Edit className="h-4 w-4" />
            Edit Project
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Archive Project</DropdownMenuItem>
              <DropdownMenuItem>Export Data</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Project Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="admin-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge 
              variant={
                project.status === 'active' ? 'default' :
                project.status === 'completed' ? 'secondary' :
                project.status === 'on_hold' ? 'destructive' : 'outline'
              }
              className="capitalize"
            >
              {project.status.replace('_', ' ')}
            </Badge>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{project.progress || 0}%</div>
              <Progress value={project.progress || 0} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{project.location || 'N/A'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">
                {project.budget ? `$${project.budget.toLocaleString()}` : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Details */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Project Phases */}
          <Card className="admin-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Project Phases</CardTitle>
                  <CardDescription>Timeline and progress of project phases</CardDescription>
                </div>
                {hasSelectedPhases && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedPhaseIds.length} phase{selectedPhaseIds.length !== 1 ? 's' : ''} selected
                    </span>
                    <Button 
                      onClick={handleMarkComplete}
                      disabled={bulkPhaseUpdate.isPending}
                      className="gap-2"
                      size="sm"
                    >
                      <Check className="h-4 w-4" />
                      {bulkPhaseUpdate.isPending ? 'Updating...' : 'Mark Complete'}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {phases.length > 0 ? (
                <DataTable
                  columns={phaseColumns}
                  data={phases}
                  searchPlaceholder="Search phases..."
                  enableRowSelection={true}
                  onRowSelectionChange={setSelectedPhases}
                  rowSelection={selectedPhases}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No phases found for this project.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          {/* Project Info */}
          <Card className="admin-card">
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.location && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Location</label>
                  <p className="text-foreground">{project.location}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge 
                    variant={
                      project.status === 'active' ? 'default' :
                      project.status === 'completed' ? 'secondary' :
                      project.status === 'planning' ? 'outline' : 'secondary'
                    }
                    className="capitalize"
                  >
                    {project.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              {project.start_date && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                  <p className="text-foreground">{new Date(project.start_date).toLocaleDateString()}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p className="text-foreground">{new Date(project.created_at).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}