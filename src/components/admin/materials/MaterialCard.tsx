import { MoreHorizontal, Edit, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Material } from '@/hooks/useMaterials';

interface MaterialCardProps {
  material: Material;
  onEdit: (material: Material) => void;
  onDelete: (material: Material) => void;
}

export function MaterialCard({ material, onEdit, onDelete }: MaterialCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-base">{material.name}</h3>
            {material.sku && (
              <p className="text-sm text-muted-foreground font-mono">{material.sku}</p>
            )}
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(material)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(material)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Category:</span>
            <div className="mt-1">
              {material.category ? (
                <Badge variant="secondary" className="text-xs">
                  {material.category}
                </Badge>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
          </div>
          
          <div>
            <span className="text-muted-foreground">Unit:</span>
            <div className="mt-1 font-medium">
              {material.unit || '-'}
            </div>
          </div>
          
          <div>
            <span className="text-muted-foreground">Unit Cost:</span>
            <div className="mt-1 font-medium">
              {material.unit_cost ? `$${material.unit_cost.toFixed(2)}` : '-'}
            </div>
          </div>
          
          <div>
            <span className="text-muted-foreground">Supplier:</span>
            <div className="mt-1 font-medium">
              {material.supplier || '-'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}