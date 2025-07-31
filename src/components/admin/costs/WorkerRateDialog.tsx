import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WorkerRate, useCreateWorkerRate } from '@/hooks/useWorkerCosts';
import { useWorkers } from '@/hooks/useWorkers';
import { logger } from '@/utils/logger';

interface WorkerRateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rate?: WorkerRate | null;
}

export function WorkerRateDialog({ open, onOpenChange, rate }: WorkerRateDialogProps) {
  const [formData, setFormData] = useState({
    worker_id: rate?.worker_id || '',
    payment_type: rate?.payment_type || 'hourly' as const,
    hourly_rate: rate?.hourly_rate?.toString() || '',
    monthly_salary: rate?.monthly_salary?.toString() || '',
    effective_date: rate?.effective_date || new Date().toISOString().split('T')[0],
    end_date: rate?.end_date || '',
  });

  const { data: workers = [], isLoading: workersLoading } = useWorkers();
  const createRate = useCreateWorkerRate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    logger.debug('Form submitted with data:', formData);
    
    if (!formData.worker_id) {
      logger.error('No worker selected for rate dialog');
      return;
    }

    const newRate = {
      ...formData,
      hourly_rate: parseFloat(formData.hourly_rate) || 0,
      monthly_salary: parseFloat(formData.monthly_salary) || 0,
    };
    
    createRate.mutate(newRate, {
      onSuccess: () => {
        onOpenChange(false);
      },
      onError: (error) => {
        logger.error('Dialog error callback', error);
        alert(`Failed to create worker rate: ${error.message}`);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{rate ? 'Edit Worker Rate' : 'Add Worker Rate'}</DialogTitle>
          <DialogDescription>
            Set hourly rates, salaries, or contract terms for workers.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="worker_id">Worker</Label>
            <Select
              value={formData.worker_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, worker_id: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a worker" />
              </SelectTrigger>
              <SelectContent>
                {workersLoading ? (
                  <SelectItem value="" disabled>Loading workers...</SelectItem>
                ) : workers.length === 0 ? (
                  <SelectItem value="" disabled>No workers available</SelectItem>
                ) : (
                  workers.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.full_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_type">Payment Type</Label>
            <Select
              value={formData.payment_type}
              onValueChange={(value: 'hourly' | 'salary' | 'contract') => 
                setFormData(prev => ({ ...prev, payment_type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="salary">Monthly Salary</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.payment_type === 'hourly' && (
            <div className="space-y-2">
              <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
              <Input
                id="hourly_rate"
                type="number"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                placeholder="25.00"
                required
              />
            </div>
          )}

          {formData.payment_type === 'salary' && (
            <div className="space-y-2">
              <Label htmlFor="monthly_salary">Monthly Salary ($)</Label>
              <Input
                id="monthly_salary"
                type="number"
                step="0.01"
                value={formData.monthly_salary}
                onChange={(e) => setFormData(prev => ({ ...prev, monthly_salary: e.target.value }))}
                placeholder="5000.00"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="effective_date">Effective Date</Label>
              <Input
                id="effective_date"
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData(prev => ({ ...prev, effective_date: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date (Optional)</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createRate.isPending || workersLoading || !formData.worker_id}
            >
              {createRate.isPending ? 'Saving...' : rate ? 'Update Rate' : 'Add Rate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}