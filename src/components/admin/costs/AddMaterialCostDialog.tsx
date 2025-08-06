import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAddMaterialCost } from '@/hooks/usePhaseCosts';

interface AddMaterialCostDialogProps {
  isOpen: boolean;
  onClose: () => void;
  phaseId: string;
}

export function AddMaterialCostDialog({ isOpen, onClose, phaseId }: AddMaterialCostDialogProps) {
  const [formData, setFormData] = useState({
    material_name: '',
    material_sku: '',
    quantity: 1,
    unit_cost: 0,
    status: 'planned' as const,
    notes: '',
  });

  const addMaterialCost = useAddMaterialCost();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const materialData = {
      phase_id: phaseId,
      ...formData,
      total_cost: formData.quantity * formData.unit_cost,
    };

    addMaterialCost.mutate(materialData, {
      onSuccess: () => {
        onClose();
        setFormData({
          material_name: '',
          material_sku: '',
          quantity: 1,
          unit_cost: 0,
          status: 'planned',
          notes: '',
        });
      },
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const totalCost = formData.quantity * formData.unit_cost;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Material Cost</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="material_name">Material Name *</Label>
            <Input
              id="material_name"
              value={formData.material_name}
              onChange={(e) => handleChange('material_name', e.target.value)}
              placeholder="Enter material name"
              required
            />
          </div>

          <div>
            <Label htmlFor="material_sku">SKU / Part Number</Label>
            <Input
              id="material_sku"
              value={formData.material_sku}
              onChange={(e) => handleChange('material_sku', e.target.value)}
              placeholder="Enter SKU or part number"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div>
              <Label htmlFor="unit_cost">Unit Cost (€) *</Label>
              <Input
                id="unit_cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => handleChange('unit_cost', parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="used">Used</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional notes about this material"
              rows={3}
            />
          </div>

          <div className="bg-muted p-3 rounded-md">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Cost:</span>
              <span className="text-lg font-bold">€{totalCost.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={addMaterialCost.isPending} className="flex-1">
              {addMaterialCost.isPending ? 'Adding...' : 'Add Material'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}