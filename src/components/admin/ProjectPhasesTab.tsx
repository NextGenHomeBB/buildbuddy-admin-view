import { useState } from 'react';
import { Plus, Zap, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhaseCard } from '@/components/admin/PhaseCard';
import { PhaseDrawer } from '@/components/admin/PhaseDrawer';
import { ApplyFastPhasesModal } from '@/components/admin/ApplyFastPhasesModal';
import { DeletePhaseDialog } from '@/components/admin/DeletePhaseDialog';
import { usePhases, ProjectPhase } from '@/hooks/usePhases';

interface ProjectPhasesTabProps {
  projectId: string;
}

export function ProjectPhasesTab({ projectId }: ProjectPhasesTabProps) {
  const { data: phases = [], isLoading } = usePhases(projectId);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<ProjectPhase | null>(null);
  const [fastPhasesModalOpen, setFastPhasesModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [phaseToDelete, setPhaseToDelete] = useState<{ id: string; name: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  // Filter phases based on search term
  const filteredPhases = phases.filter(phase =>
    phase.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (phase.description && phase.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Project Phases</h2>
          <p className="text-muted-foreground mt-1">
            Manage and track progress of individual project phases. Click on a phase to view its tasks.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
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

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search phases..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Phases Grid */}
      {filteredPhases.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredPhases.map((phase) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              projectId={projectId}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            {searchTerm ? 'No phases found matching your search.' : 'No phases found for this project.'}
          </div>
        </div>
      )}

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
