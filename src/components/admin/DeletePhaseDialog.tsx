import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeletePhase } from '@/hooks/usePhases';
import { useToast } from '@/hooks/use-toast';

interface DeletePhaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phaseId: string;
  phaseName: string;
}

export function DeletePhaseDialog({
  open,
  onOpenChange,
  phaseId,
  phaseName,
}: DeletePhaseDialogProps) {
  const deletePhase = useDeletePhase();
  const { toast } = useToast();

  const handleConfirm = async () => {
    try {
      await deletePhase.mutateAsync(phaseId);
      onOpenChange(false);
      toast({
        title: 'Phase deleted',
        description: `"${phaseName}" has been deleted successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete phase. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Phase</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the phase "{phaseName}"? This action
            cannot be undone and will also delete all associated tasks.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deletePhase.isPending}
          >
            {deletePhase.isPending ? 'Deleting...' : 'Delete Phase'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}