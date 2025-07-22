import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Check, Calendar, CheckCircle, Clock, AlertCircle, Circle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/admin/DataTable';
import { PhaseDrawer } from '@/components/admin/PhaseDrawer';
import { ApplyFastPhasesModal } from '@/components/admin/ApplyFastPhasesModal';
import { usePhases, ProjectPhase } from '@/hooks/usePhases';
import { useBulkPhaseUpdate } from '@/hooks/useBulkPhaseUpdate';

interface PhasesTableTabProps {
  projectId: string;
}

const getPhaseStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-success" />;
    case 'in_progress':
      return <Clock className="h-4 w-4 text-primary" />;
    case 'blocked':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case 'not_started':
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
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

export function PhasesTableTab({ projectId }: PhasesTableTabProps) {
  const { data: phases = [], isLoading } = usePhases(projectId);
  const [selectedPhases, setSelectedPhases] = useState<Record<string, boolean>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [fastPhasesModalOpen, setFastPhasesModalOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<ProjectPhase | null>(null);
  
  const bulkPhaseUpdate = useBulkPhaseUpdate();

  // Get selected phase IDs
  const selectedPhaseIds = Object.keys(selectedPhases).filter(id => selectedPhases[id]);
  const hasSelectedPhases = selectedPhaseIds.length > 0;

  // Handle bulk update
  const handleMarkComplete = async () => {
    if (selectedPhaseIds.length === 0) return;
    
    await bulkPhaseUpdate.mutateAsync({
      projectId,
      phaseIds: selectedPhaseIds,
      status: 'completed'
    });
    
    // Clear selection after successful update
    setSelectedPhases({});
  };

  // Define columns for the phases table
  const columns: ColumnDef<ProjectPhase>[] = [
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
          <div 
            className="flex items-start gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors"
            onClick={() => {
              setEditingPhase(phase);
              setDrawerOpen(true);
            }}
          >
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

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading phases...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Project Phases</CardTitle>
              <CardDescription>Manage and track project phases</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {hasSelectedPhases && (
                <>
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
                </>
              )}
              <Button 
                variant="outline" 
                className="gap-2" 
                onClick={() => setFastPhasesModalOpen(true)}
              >
                <Zap className="h-4 w-4" />
                Fast Phases
              </Button>
              <Button className="gap-2" onClick={() => setDrawerOpen(true)}>
                <Plus className="h-4 w-4" />
                New Phase
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {phases.length > 0 ? (
            <DataTable
              columns={columns}
              data={phases}
              searchPlaceholder="Search phases..."
              enableRowSelection={true}
              onRowSelectionChange={setSelectedPhases}
              rowSelection={selectedPhases}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No phases found for this project.</p>
              <Button className="mt-4 gap-2" onClick={() => setDrawerOpen(true)}>
                <Plus className="h-4 w-4" />
                Add First Phase
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phase Drawer */}
      <PhaseDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingPhase(null);
        }}
        projectId={projectId}
        editingPhase={editingPhase}
      />

      {/* Fast Phases Modal */}
      <ApplyFastPhasesModal
        projectId={projectId}
        open={fastPhasesModalOpen}
        onOpenChange={setFastPhasesModalOpen}
      />
    </div>
  );
}