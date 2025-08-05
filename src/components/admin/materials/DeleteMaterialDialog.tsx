import { useState } from 'react';
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
import { Material, useMaterials } from '@/hooks/useMaterials';

interface DeleteMaterialDialogProps {
  material: Material | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteMaterialDialog({ material, open, onOpenChange }: DeleteMaterialDialogProps) {
  const [loading, setLoading] = useState(false);
  const { deleteMaterial } = useMaterials();

  const handleDelete = async () => {
    if (!material) return;
    
    setLoading(true);
    try {
      await deleteMaterial(material.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting material:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Material</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{material?.name}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}