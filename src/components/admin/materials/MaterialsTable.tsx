import { useState } from 'react';
import { MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Material, useMaterials } from '@/hooks/useMaterials';
import { MaterialDialog } from './MaterialDialog';
import { DeleteMaterialDialog } from './DeleteMaterialDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { MaterialCard } from './MaterialCard';

interface MaterialsTableProps {
  materials: Material[];
  loading: boolean;
}

export function MaterialsTable({ materials, loading }: MaterialsTableProps) {
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null);
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          <p className="text-lg font-medium">No materials found</p>
          <p className="text-sm">Add materials to get started with your database</p>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <>
        <div className="space-y-4">
          {materials.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              onEdit={setEditingMaterial}
              onDelete={setDeletingMaterial}
            />
          ))}
        </div>
        
        <MaterialDialog
          material={editingMaterial}
          open={!!editingMaterial}
          onOpenChange={(open) => !open && setEditingMaterial(null)}
        />
        
        <DeleteMaterialDialog
          material={deletingMaterial}
          open={!!deletingMaterial}
          onOpenChange={(open) => !open && setDeletingMaterial(null)}
        />
      </>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Unit Cost</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((material) => (
              <TableRow key={material.id}>
                <TableCell className="font-mono text-sm">
                  {material.sku || '-'}
                </TableCell>
                <TableCell className="font-medium">
                  {material.name}
                </TableCell>
                <TableCell>
                  {material.category ? (
                    <Badge variant="secondary">{material.category}</Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>{material.unit || '-'}</TableCell>
                <TableCell>
                  {material.unit_cost ? (
                    <span className="font-medium">
                      ${material.unit_cost.toFixed(2)}
                    </span>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>{material.supplier || '-'}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingMaterial(material)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeletingMaterial(material)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <MaterialDialog
        material={editingMaterial}
        open={!!editingMaterial}
        onOpenChange={(open) => !open && setEditingMaterial(null)}
      />
      
      <DeleteMaterialDialog
        material={deletingMaterial}
        open={!!deletingMaterial}
        onOpenChange={(open) => !open && setDeletingMaterial(null)}
      />
    </>
  );
}