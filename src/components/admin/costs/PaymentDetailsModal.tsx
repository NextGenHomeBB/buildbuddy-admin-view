import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, DollarSign, Clock, User } from 'lucide-react';
import { WorkerPayment } from '@/hooks/useWorkerCosts';
import { format } from 'date-fns';

interface PaymentDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: WorkerPayment | null;
}

export function PaymentDetailsModal({ open, onOpenChange, payment }: PaymentDetailsModalProps) {
  if (!payment) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={payment.profiles?.avatar_url} />
              <AvatarFallback>
                {payment.profiles?.full_name?.split(' ').map(n => n[0]).join('') || 'W'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div>{payment.profiles?.full_name || 'Unknown Worker'}</div>
              <Badge className={getStatusColor(payment.status)}>
                {payment.status}
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription>
            Payment details for pay period {format(new Date(payment.pay_period_start), 'MMM dd')} - {format(new Date(payment.pay_period_end), 'MMM dd, yyyy')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Pay Period Information */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Pay Period Start</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(payment.pay_period_start), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Pay Period End</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(payment.pay_period_end), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hours and Pay Breakdown */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Hours & Pay Breakdown
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Regular Hours</div>
                  <div className="text-lg font-semibold">{(payment.hours_worked || 0) - (payment.overtime_hours || 0)}h</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Overtime Hours</div>
                  <div className="text-lg font-semibold">{payment.overtime_hours || 0}h</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Regular Pay</div>
                  <div className="text-lg font-semibold">${payment.regular_pay?.toLocaleString() || '0'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Overtime Pay</div>
                  <div className="text-lg font-semibold">${payment.overtime_pay?.toLocaleString() || '0'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Bonuses</div>
                  <div className="text-lg font-semibold text-green-600">+${payment.bonuses?.toLocaleString() || '0'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Deductions</div>
                  <div className="text-lg font-semibold text-red-600">-${payment.deductions?.toLocaleString() || '0'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Pay */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Payment Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Gross Pay</span>
                  <span className="font-semibold">${payment.gross_pay?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-3">
                  <span className="font-medium">Net Pay</span>
                  <span className="text-xl font-bold">${payment.net_pay?.toLocaleString() || '0'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <User className="h-4 w-4" />
                Additional Information
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Created</div>
                  <div>{format(new Date(payment.created_at), 'MMM dd, yyyy hh:mm a')}</div>
                </div>
                {payment.payment_date && (
                  <div>
                    <div className="text-sm text-muted-foreground">Payment Date</div>
                    <div>{format(new Date(payment.payment_date), 'MMM dd, yyyy')}</div>
                  </div>
                )}
                {payment.notes && (
                  <div>
                    <div className="text-sm text-muted-foreground">Notes</div>
                    <div className="bg-muted p-3 rounded text-sm">{payment.notes}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}