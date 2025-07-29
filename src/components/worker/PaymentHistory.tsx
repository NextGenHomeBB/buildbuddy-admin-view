import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { DollarSign, Clock, FileText } from 'lucide-react';

interface PaymentRecord {
  id: string;
  pay_period_start: string;
  pay_period_end: string;
  hours_worked: number;
  gross_pay: number;
  status: string;
  notes: string | null;
  created_at: string;
}

export function PaymentHistory() {
  const { user } = useAuth();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['worker-payment-history', user?.id],
    queryFn: async (): Promise<PaymentRecord[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('worker_payments')
        .select('id, pay_period_start, pay_period_end, hours_worked, gross_pay, status, notes, created_at')
        .eq('worker_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex justify-between items-center p-3 border rounded">
                <div className="space-y-1">
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="h-3 bg-muted rounded w-20"></div>
                </div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No payment records yet</p>
            <p className="text-xs">Complete shifts to generate payments</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div key={payment.id} className="flex justify-between items-center p-3 border rounded hover:bg-muted/30 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {format(new Date(payment.pay_period_start), 'MMM dd')} - {format(new Date(payment.pay_period_end), 'MMM dd')}
                    </p>
                    {payment.notes?.includes('Auto-generated') && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-2 w-2 mr-1" />
                        Auto
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {payment.hours_worked}h worked
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="font-semibold">${payment.gross_pay.toFixed(2)}</p>
                  <Badge className={getStatusColor(payment.status)} variant="outline">
                    {payment.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}