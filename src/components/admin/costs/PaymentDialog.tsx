import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useWorkers } from '@/hooks/useWorkers';
import { useWorkerRates, useCreateWorkerPayment } from '@/hooks/useWorkerCosts';
import { Calculator } from 'lucide-react';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentDialog({ open, onOpenChange }: PaymentDialogProps) {
  const [formData, setFormData] = useState({
    worker_id: '',
    pay_period_start: '',
    pay_period_end: '',
    hours_worked: '',
    overtime_hours: '0',
    bonuses: '0',
    deductions: '0',
    notes: '',
  });

  const [calculatedPay, setCalculatedPay] = useState({
    regular_pay: 0,
    overtime_pay: 0,
    gross_pay: 0,
    net_pay: 0,
  });

  const { data: workers = [] } = useWorkers();
  const { data: rates = [] } = useWorkerRates();
  const createPayment = useCreateWorkerPayment();

  // Calculate pay when form data changes
  useEffect(() => {
    if (formData.worker_id && formData.hours_worked) {
      const workerRate = rates.find(r => r.worker_id === formData.worker_id && !r.end_date);
      if (workerRate) {
        const hoursWorked = parseFloat(formData.hours_worked) || 0;
        const overtimeHours = parseFloat(formData.overtime_hours) || 0;
        const bonuses = parseFloat(formData.bonuses) || 0;
        const deductions = parseFloat(formData.deductions) || 0;

        let regularPay = 0;
        let overtimePay = 0;

        if (workerRate.payment_type === 'hourly' && workerRate.hourly_rate) {
          const regularHours = Math.max(0, hoursWorked - overtimeHours);
          regularPay = regularHours * workerRate.hourly_rate;
          overtimePay = overtimeHours * workerRate.hourly_rate * 1.5; // 1.5x for overtime
        } else if (workerRate.payment_type === 'salary' && workerRate.monthly_salary) {
          // For salary, assume standard work week
          regularPay = workerRate.monthly_salary / 4; // Weekly pay
        }

        const grossPay = regularPay + overtimePay + bonuses;
        const netPay = grossPay - deductions;

        setCalculatedPay({
          regular_pay: regularPay,
          overtime_pay: overtimePay,
          gross_pay: grossPay,
          net_pay: netPay,
        });
      }
    }
  }, [formData, rates]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const paymentData = {
      worker_id: formData.worker_id,
      pay_period_start: formData.pay_period_start,
      pay_period_end: formData.pay_period_end,
      hours_worked: parseFloat(formData.hours_worked) || 0,
      overtime_hours: parseFloat(formData.overtime_hours) || 0,
      regular_pay: calculatedPay.regular_pay,
      overtime_pay: calculatedPay.overtime_pay,
      bonuses: parseFloat(formData.bonuses) || 0,
      deductions: parseFloat(formData.deductions) || 0,
      gross_pay: calculatedPay.gross_pay,
      net_pay: calculatedPay.net_pay,
      status: 'pending' as const,
      notes: formData.notes || null,
    };

    createPayment.mutate(paymentData, {
      onSuccess: () => {
        onOpenChange(false);
        setFormData({
          worker_id: '',
          pay_period_start: '',
          pay_period_end: '',
          hours_worked: '',
          overtime_hours: '0',
          bonuses: '0',
          deductions: '0',
          notes: '',
        });
        setCalculatedPay({
          regular_pay: 0,
          overtime_pay: 0,
          gross_pay: 0,
          net_pay: 0,
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Payment Record</DialogTitle>
          <DialogDescription>
            Generate a payment record for a worker's pay period
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
                {workers.map((worker) => (
                  <SelectItem key={worker.id} value={worker.id}>
                    {worker.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pay_period_start">Pay Period Start</Label>
              <Input
                id="pay_period_start"
                type="date"
                value={formData.pay_period_start}
                onChange={(e) => setFormData(prev => ({ ...prev, pay_period_start: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay_period_end">Pay Period End</Label>
              <Input
                id="pay_period_end"
                type="date"
                value={formData.pay_period_end}
                onChange={(e) => setFormData(prev => ({ ...prev, pay_period_end: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hours_worked">Hours Worked</Label>
              <Input
                id="hours_worked"
                type="number"
                step="0.5"
                value={formData.hours_worked}
                onChange={(e) => setFormData(prev => ({ ...prev, hours_worked: e.target.value }))}
                placeholder="40"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="overtime_hours">Overtime Hours</Label>
              <Input
                id="overtime_hours"
                type="number"
                step="0.5"
                value={formData.overtime_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, overtime_hours: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bonuses">Bonuses ($)</Label>
              <Input
                id="bonuses"
                type="number"
                step="0.01"
                value={formData.bonuses}
                onChange={(e) => setFormData(prev => ({ ...prev, bonuses: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deductions">Deductions ($)</Label>
              <Input
                id="deductions"
                type="number"
                step="0.01"
                value={formData.deductions}
                onChange={(e) => setFormData(prev => ({ ...prev, deductions: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          {formData.worker_id && formData.hours_worked && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <Calculator className="h-4 w-4" />
                Pay Calculation
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>Regular Pay: ${calculatedPay.regular_pay.toFixed(2)}</div>
                <div>Overtime Pay: ${calculatedPay.overtime_pay.toFixed(2)}</div>
                <div>Gross Pay: ${calculatedPay.gross_pay.toFixed(2)}</div>
                <div className="font-medium">Net Pay: ${calculatedPay.net_pay.toFixed(2)}</div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about this payment..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPayment.isPending}>
              {createPayment.isPending ? 'Creating...' : 'Create Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}