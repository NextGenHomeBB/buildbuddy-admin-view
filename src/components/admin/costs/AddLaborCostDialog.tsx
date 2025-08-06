import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAddLaborCost } from '@/hooks/usePhaseCosts';
import { useWorkers } from '@/hooks/useWorkers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddLaborCostDialogProps {
  isOpen: boolean;
  onClose: () => void;
  phaseId: string;
}

export function AddLaborCostDialog({ isOpen, onClose, phaseId }: AddLaborCostDialogProps) {
  const [formData, setFormData] = useState({
    worker_id: '',
    pricing_type: 'hourly' as 'hourly' | 'fixed',
    hours_planned: 0,
    hours_actual: 0,
    hourly_rate: 25, // Default hourly rate
    fixed_price: 0,
    work_date: new Date().toISOString().split('T')[0], // Today's date
    description: '',
  });

  const addLaborCost = useAddLaborCost();
  const { data: workers = [] } = useWorkers();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { pricing_type, fixed_price, ...dbFields } = formData;
    
    const laborData = {
      phase_id: phaseId,
      ...dbFields,
      total_planned_cost: pricing_type === 'hourly' 
        ? formData.hours_planned * formData.hourly_rate 
        : fixed_price,
      total_actual_cost: pricing_type === 'hourly' 
        ? formData.hours_actual * formData.hourly_rate 
        : fixed_price,
    };

    addLaborCost.mutate(laborData, {
      onSuccess: () => {
        onClose();
        setFormData({
          worker_id: '',
          pricing_type: 'hourly',
          hours_planned: 0,
          hours_actual: 0,
          hourly_rate: 25,
          fixed_price: 0,
          work_date: new Date().toISOString().split('T')[0],
          description: '',
        });
      },
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const plannedCost = formData.pricing_type === 'hourly' 
    ? formData.hours_planned * formData.hourly_rate 
    : formData.fixed_price;
  const actualCost = formData.pricing_type === 'hourly' 
    ? formData.hours_actual * formData.hourly_rate 
    : formData.fixed_price;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Labor Cost</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="worker_id">Worker *</Label>
            <Select value={formData.worker_id} onValueChange={(value) => handleChange('worker_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a worker" />
              </SelectTrigger>
              <SelectContent>
                {workers.map((worker) => (
                  <SelectItem key={worker.id} value={worker.id}>
                    {worker.full_name || 'Unknown Worker'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="pricing_type">Pricing Type</Label>
            <Select value={formData.pricing_type} onValueChange={(value) => handleChange('pricing_type', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Hourly Rate</SelectItem>
                <SelectItem value="fixed">Fixed Price</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="work_date">Work Date</Label>
            <Input
              id="work_date"
              type="date"
              value={formData.work_date}
              onChange={(e) => handleChange('work_date', e.target.value)}
            />
          </div>

          {formData.pricing_type === 'hourly' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hours_planned">Planned Hours</Label>
                  <Input
                    id="hours_planned"
                    type="number"
                    min="0"
                    step="0.25"
                    value={formData.hours_planned}
                    onChange={(e) => handleChange('hours_planned', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div>
                  <Label htmlFor="hours_actual">Actual Hours</Label>
                  <Input
                    id="hours_actual"
                    type="number"
                    min="0"
                    step="0.25"
                    value={formData.hours_actual}
                    onChange={(e) => handleChange('hours_actual', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="hourly_rate">Hourly Rate (€) *</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => handleChange('hourly_rate', parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
            </>
          ) : (
            <div>
              <Label htmlFor="fixed_price">Fixed Price (€) *</Label>
              <Input
                id="fixed_price"
                type="number"
                min="0"
                step="0.01"
                value={formData.fixed_price}
                onChange={(e) => handleChange('fixed_price', parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Description of work performed"
              rows={3}
            />
          </div>

          <div className="bg-muted p-3 rounded-md space-y-2">
            <div className="flex justify-between">
              <span>Planned Cost:</span>
              <span className="font-medium">€{plannedCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Actual Cost:</span>
              <span className="font-medium">€{actualCost.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={addLaborCost.isPending || !formData.worker_id} className="flex-1">
              {addLaborCost.isPending ? 'Adding...' : 'Add Labor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}