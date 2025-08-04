import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const clientDetailsSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  clientEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  clientAddress: z.string().optional(),
  clientPhone: z.string().optional(),
  validUntil: z.date().optional(),
  notes: z.string().optional(),
  termsConditions: z.string().optional(),
  taxRate: z.number().min(0).max(100).default(0),
});

type ClientDetailsFormData = z.infer<typeof clientDetailsSchema>;

interface ClientDetailsStepProps {
  onComplete: (data: any) => void;
  isProcessing: boolean;
}

export const ClientDetailsStep: React.FC<ClientDetailsStepProps> = ({
  onComplete,
  isProcessing
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ClientDetailsFormData>({
    resolver: zodResolver(clientDetailsSchema),
    defaultValues: {
      taxRate: 0,
      termsConditions: 'Payment terms: Net 30 days. All prices are subject to change without notice.',
    },
  });

  const validUntil = watch('validUntil');

  const onSubmit = (data: ClientDetailsFormData) => {
    const submitData = {
      ...data,
      validUntil: data.validUntil ? format(data.validUntil, 'yyyy-MM-dd') : undefined,
    };
    onComplete(submitData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                {...register('clientName')}
                placeholder="Enter client name"
                className={cn(errors.clientName && 'border-destructive')}
              />
              {errors.clientName && (
                <p className="text-sm text-destructive mt-1">
                  {errors.clientName.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="clientEmail">Email Address</Label>
              <Input
                id="clientEmail"
                type="email"
                {...register('clientEmail')}
                placeholder="client@example.com"
                className={cn(errors.clientEmail && 'border-destructive')}
              />
              {errors.clientEmail && (
                <p className="text-sm text-destructive mt-1">
                  {errors.clientEmail.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="clientPhone">Phone Number</Label>
              <Input
                id="clientPhone"
                {...register('clientPhone')}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <Label htmlFor="clientAddress">Address</Label>
              <Textarea
                id="clientAddress"
                {...register('clientAddress')}
                placeholder="Enter client address"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quotation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Valid Until</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !validUntil && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {validUntil ? format(validUntil, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={validUntil}
                    onSelect={(date) => setValue('validUntil', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('taxRate', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Additional notes for this quotation"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="termsConditions">Terms & Conditions</Label>
              <Textarea
                id="termsConditions"
                {...register('termsConditions')}
                placeholder="Enter terms and conditions"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isProcessing}
          className="min-w-[120px]"
        >
          {isProcessing ? (
            'Creating...'
          ) : (
            <>
              Next Step
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
};