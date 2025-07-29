import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useWorkers } from '@/hooks/useWorkers';
import { useProjects } from '@/hooks/useProjects';
import { useCreateWorkerExpense } from '@/hooks/useWorkerCosts';
import { Upload, FileText } from 'lucide-react';

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const expenseTypes = [
  'Materials',
  'Transportation',
  'Meals',
  'Fuel',
  'Equipment',
  'Lodging',
  'Supplies',
  'Other'
];

export function ExpenseDialog({ open, onOpenChange }: ExpenseDialogProps) {
  const [formData, setFormData] = useState({
    worker_id: '',
    project_id: '',
    expense_type: '',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
  });

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: workers = [] } = useWorkers();
  const { data: projects = [] } = useProjects();
  const createExpense = useCreateWorkerExpense();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        alert('Please upload a valid image (JPEG, PNG, WEBP) or PDF file.');
        return;
      }

      if (file.size > maxSize) {
        alert('File size must be less than 5MB.');
        return;
      }

      setReceiptFile(file);
    }
  };

  const uploadReceipt = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const { supabase } = await import('@/integrations/supabase/client');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `receipt-${Date.now()}.${fileExt}`;
      const filePath = `expenses/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let receiptUrl = null;
    if (receiptFile) {
      receiptUrl = await uploadReceipt(receiptFile);
      if (!receiptUrl) {
        alert('Failed to upload receipt. Please try again.');
        return;
      }
    }

    const expenseData = {
      worker_id: formData.worker_id,
      project_id: formData.project_id || null,
      expense_type: formData.expense_type,
      description: formData.description,
      amount: parseFloat(formData.amount),
      expense_date: formData.expense_date,
      receipt_url: receiptUrl,
      status: 'pending' as const,
    };

    createExpense.mutate(expenseData, {
      onSuccess: () => {
        onOpenChange(false);
        setFormData({
          worker_id: '',
          project_id: '',
          expense_type: '',
          description: '',
          amount: '',
          expense_date: new Date().toISOString().split('T')[0],
        });
        setReceiptFile(null);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Expense Claim</DialogTitle>
          <DialogDescription>
            Submit an expense claim for reimbursement
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

          <div className="space-y-2">
            <Label htmlFor="project_id">Project (Optional)</Label>
            <Select
              value={formData.project_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expense_type">Expense Type</Label>
              <Select
                value={formData.expense_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, expense_type: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
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

            <div className="space-y-2">
              <Label htmlFor="expense_date">Expense Date</Label>
              <Input
                id="expense_date"
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expense_date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the expense..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt">Receipt (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="receipt"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('receipt')?.click()}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                {receiptFile ? receiptFile.name : 'Upload Receipt'}
              </Button>
            </div>
            {receiptFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{receiptFile.name} ({(receiptFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createExpense.isPending || uploading}>
              {createExpense.isPending || uploading ? 'Creating...' : 'Create Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}