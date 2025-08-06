import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAddExpense } from '@/hooks/usePhaseCosts';

interface AddExpenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  phaseId: string;
}

const expenseTypes = [
  'Equipment Rental',
  'Transportation',
  'Permits',
  'Utilities',
  'Insurance',
  'Tools',
  'Safety Equipment',
  'Waste Disposal',
  'Miscellaneous',
];

export function AddExpenseDialog({ isOpen, onClose, phaseId }: AddExpenseDialogProps) {
  const [formData, setFormData] = useState({
    expense_type: '',
    description: '',
    amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    receipt_url: '',
  });

  const addExpense = useAddExpense();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const expenseData = {
      phase_id: phaseId,
      ...formData,
    };

    addExpense.mutate(expenseData, {
      onSuccess: () => {
        onClose();
        setFormData({
          expense_type: '',
          description: '',
          amount: 0,
          expense_date: new Date().toISOString().split('T')[0],
          receipt_url: '',
        });
      },
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="expense_type">Expense Type *</Label>
            <Select value={formData.expense_type} onValueChange={(value) => handleChange('expense_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select expense type" />
              </SelectTrigger>
              <SelectContent>
                {expenseTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe the expense"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount (€) *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div>
              <Label htmlFor="expense_date">Date</Label>
              <Input
                id="expense_date"
                type="date"
                value={formData.expense_date}
                onChange={(e) => handleChange('expense_date', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="receipt_url">Receipt URL</Label>
            <Input
              id="receipt_url"
              type="url"
              value={formData.receipt_url}
              onChange={(e) => handleChange('receipt_url', e.target.value)}
              placeholder="Link to receipt or invoice"
            />
          </div>

          <div className="bg-muted p-3 rounded-md">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Amount:</span>
              <span className="text-lg font-bold">€{formData.amount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={addExpense.isPending || !formData.expense_type || !formData.description} className="flex-1">
              {addExpense.isPending ? 'Adding...' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}