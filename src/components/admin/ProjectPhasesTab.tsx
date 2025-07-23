import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, MoreHorizontal, Edit, Trash2, Calendar, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/admin/DataTable';
import { Progress } from '@/components/ui/progress';
import { StatusChip } from '@/components/admin/StatusChip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PhaseDrawer } from '@/components/admin/PhaseDrawer';
import { ApplyFastPhasesModal } from '@/components/admin/ApplyFastPhasesModal';
import { DeletePhaseDialog } from '@/components/admin/DeletePhaseDialog';
import { usePhases, ProjectPhase } from '@/hooks/usePhases';

interface ProjectPhasesTabProps {
  projectId: string;
}

export function ProjectPhasesTab({ projectId }: ProjectPhasesTabProps) {
  const { data: phases = [], isLoading } = usePhases(projectId);
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<ProjectPhase | null>(null);
  const [fastPhasesModalOpen, setFastPhasesModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [phaseToDelete, setPhaseToDelete] = useState<{ id: string; name: string } | null>(null);

  const handleEdit = (phase: ProjectPhase) => {
    setEditingPhase(phase);
    setDrawerOpen(true);
  };

  const handleDelete = (phase: ProjectPhase) => {
    setPhaseToDelete({ id: phase.id, name: phase.name });
    setDeleteDialogOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setEditingPhase(null);
  };

  const handlePhaseClick = (phase: ProjectPhase) => {
    navigate(`/admin/projects/${projectId}/phases/${phase.id}`);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const columns: ColumnDef<ProjectPhase>[] = [
    {
      accessorKey: 'name',
      header: 'Phase Name',
      cell: ({ row }) => {
        const phase = row.original;
        return (
          <div 
            className="space-y-1 cursor-pointer hover:text-primary transition-colors"
            onClick={() => handlePhaseClick(phase)}
          >
            <div className="font-medium text-foreground hover:underline">{phase.name}</div>
            {phase.description && (
              <div className="text-sm text-muted-foreground line-clamp-2">
                {phase.description}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return <StatusChip status={status} />;
      },
    },
    {
      accessorKey: 'progress',
      header: 'Progress',
      cell: ({ row }) => {
        const progress = row.getValue('progress') as number || 0;
        return (
          <div className="w-24 space-y-1">
            <Progress value={progress} className="h-2" />
            <div className="text-xs text-muted-foreground text-center">
              {progress.toFixed(0)}%
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'start_date',
      header: 'Start Date',
      cell: ({ row }) => {
        const startDate = row.getValue('start_date') as string;
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {formatDate(startDate)}
          </div>
        );
      },
    },
    {
      accessorKey: 'end_date',
      header: 'End Date',
      cell: ({ row }) => {
        const endDate = row.getValue('end_date') as string;
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {formatDate(endDate)}
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const phase = row.original;
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
                onClick={() => handleEdit(phase)}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Phase
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="gap-2 text-destructive"
                onClick={() => handleDelete(phase)}
              >
                <Trash2 className="h-4 w-4" />
                Delete Phase
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Project Phases</h2>
          <p className="text-muted-foreground mt-1">
            Manage and track progress of individual project phases. Click on a phase name to view its tasks.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setFastPhasesModalOpen(true)} 
            variant="outline" 
            className="gap-2"
          >
            <Zap className="h-4 w-4" />
            Apply Fast Phases
          </Button>
          <Button onClick={() => setDrawerOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Phase
          </Button>
        </div>
      </div>

      {/* Phases Table */}
      <DataTable
        columns={columns}
        data={phases}
        searchPlaceholder="Search phases..."
      />

      {/* Phase Drawer */}
      <PhaseDrawer
        isOpen={drawerOpen}
        onClose={handleDrawerClose}
        projectId={projectId}
        editingPhase={editingPhase}
      />

      {/* Apply Fast Phases Modal */}
      <ApplyFastPhasesModal
        open={fastPhasesModalOpen}
        onOpenChange={setFastPhasesModalOpen}
        projectId={projectId}
      />

      {/* Delete Phase Dialog */}
      {phaseToDelete && (
        <DeletePhaseDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          phaseId={phaseToDelete.id}
          phaseName={phaseToDelete.name}
        />
      )}
    </div>
  );
}
