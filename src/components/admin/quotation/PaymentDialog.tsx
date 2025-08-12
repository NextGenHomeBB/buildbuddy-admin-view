import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDocumentPayments, type NewPaymentData } from '@/hooks/useDocumentPayments';
import { format } from 'date-fns';

const paymentSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  payment_date: z.string().min(1, 'Payment date is required'),
  method: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentDialogProps {
  documentId: string;
  totalAmount: number;
  amountPaid: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentAdded: () => void;
}

export const PaymentDialog: React.FC<PaymentDialogProps> = ({
  documentId,
  totalAmount,
  amountPaid,
  open,
  onOpenChange,
  onPaymentAdded,
}) => {
  const { addPayment } = useDocumentPayments();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      amount: totalAmount - amountPaid,
    },
  });

  const remainingAmount = totalAmount - amountPaid;

  const onSubmit = async (data: PaymentFormData) => {
    try {
      const paymentData: NewPaymentData = {
        document_id: documentId,
        amount: data.amount,
        payment_date: data.payment_date,
        method: data.method,
        reference: data.reference,
        notes: data.notes,
      };
      
      await addPayment(paymentData);
      onPaymentAdded();
      reset();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-sm bg-muted p-3 rounded">
            <div>
              <div className="font-medium">Total</div>
              <div>${totalAmount.toFixed(2)}</div>
            </div>
            <div>
              <div className="font-medium">Paid</div>
              <div>${amountPaid.toFixed(2)}</div>
            </div>
            <div>
              <div className="font-medium">Remaining</div>
              <div className="text-red-600">${remainingAmount.toFixed(2)}</div>
            </div>
          </div>

          <div>
            <Label htmlFor="amount">Payment Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-sm text-red-600 mt-1">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="payment_date">Payment Date</Label>
            <Input
              id="payment_date"
              type="date"
              {...register('payment_date')}
            />
            {errors.payment_date && (
              <p className="text-sm text-red-600 mt-1">{errors.payment_date.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="method">Payment Method</Label>
            <Select onValueChange={(value) => setValue('method', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="reference">Reference/Check Number</Label>
            <Input
              id="reference"
              placeholder="Optional reference"
              {...register('reference')}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional notes"
              {...register('notes')}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};