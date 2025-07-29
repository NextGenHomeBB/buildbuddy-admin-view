import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Eye, DollarSign, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { WorkerPayment } from '@/hooks/useWorkerCosts';
import { format } from 'date-fns';
import { useUpdatePaymentStatus } from '@/hooks/useWorkerCosts';

interface PaymentsTabProps {
  payments: WorkerPayment[];
  isLoading: boolean;
}

export function PaymentsTab({ payments, isLoading }: PaymentsTabProps) {
  const [selectedPayment, setSelectedPayment] = useState<WorkerPayment | null>(null);
  const updateStatus = useUpdatePaymentStatus();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusUpdate = (paymentId: string, status: WorkerPayment['status']) => {
    updateStatus.mutate({ id: paymentId, status });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="flex justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                </div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Payment Records</h3>
          <p className="text-sm text-muted-foreground">
            Track and manage worker payments and payroll
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Payment
        </Button>
      </div>

      <div className="space-y-4">
        {payments.map((payment) => (
          <Card key={payment.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={payment.profiles?.avatar_url} />
                    <AvatarFallback>
                      {payment.profiles?.full_name?.split(' ').map(n => n[0]).join('') || 'W'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{payment.profiles?.full_name || 'Unknown Worker'}</CardTitle>
                    <CardDescription>
                      Pay Period: {format(new Date(payment.pay_period_start), 'MMM dd')} - {format(new Date(payment.pay_period_end), 'MMM dd, yyyy')}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(payment.status)}>
                    {payment.status}
                  </Badge>
                  <span className="text-lg font-semibold">
                    ${payment.net_pay?.toLocaleString() || '0'}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Hours Worked:</span>
                  <div className="font-medium">{payment.hours_worked || 0}h</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Regular Pay:</span>
                  <div className="font-medium">${payment.regular_pay?.toLocaleString() || '0'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Overtime:</span>
                  <div className="font-medium">${payment.overtime_pay?.toLocaleString() || '0'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Gross Pay:</span>
                  <div className="font-medium">${payment.gross_pay?.toLocaleString() || '0'}</div>
                </div>
              </div>
              
              {payment.notes && (
                <div className="mt-3 p-2 bg-muted rounded text-sm">
                  <span className="font-medium">Notes: </span>
                  {payment.notes}
                </div>
              )}

              <div className="flex justify-between items-center mt-4">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Created {format(new Date(payment.created_at), 'MMM dd, yyyy')}</span>
                  {payment.payment_date && (
                    <>
                      <span>•</span>
                      <span>Paid {format(new Date(payment.payment_date), 'MMM dd, yyyy')}</span>
                    </>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  {payment.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusUpdate(payment.id, 'approved')}
                        disabled={updateStatus.isPending}
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusUpdate(payment.id, 'cancelled')}
                        disabled={updateStatus.isPending}
                      >
                        <XCircle className="mr-1 h-3 w-3" />
                        Cancel
                      </Button>
                    </>
                  )}
                  {payment.status === 'approved' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(payment.id, 'paid')}
                      disabled={updateStatus.isPending}
                    >
                      <DollarSign className="mr-1 h-3 w-3" />
                      Mark as Paid
                    </Button>
                  )}
                  <Button size="sm" variant="ghost">
                    <Eye className="mr-1 h-3 w-3" />
                    Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {payments.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No payment records</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Payment records will appear here once you create them
            </p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create First Payment
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}