import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DollarSign, Clock, TrendingUp } from 'lucide-react';
import { startOfWeek, endOfWeek, format } from 'date-fns';

interface WeeklyData {
  totalHours: number;
  estimatedEarnings: number;
  pendingPayments: number;
  weekRange: string;
}

export function WeeklyEarnings() {
  const { user } = useAuth();

  const { data: weeklyData, isLoading } = useQuery({
    queryKey: ['weekly-earnings', user?.id],
    queryFn: async (): Promise<WeeklyData> => {
      if (!user?.id) throw new Error('User not authenticated');

      const now = new Date();
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);

      // Get this week's timesheet hours
      const { data: timeSheets, error: timeSheetsError } = await supabase
        .from('time_sheets')
        .select('hours')
        .eq('user_id', user.id)
        .gte('work_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('work_date', format(weekEnd, 'yyyy-MM-dd'));

      if (timeSheetsError) throw timeSheetsError;

      // Get current worker rate
      const { data: rates, error: ratesError } = await supabase
        .from('worker_rates')
        .select('hourly_rate, monthly_salary, payment_type')
        .eq('worker_id', user.id)
        .lte('effective_date', format(now, 'yyyy-MM-dd'))
        .or('end_date.is.null,end_date.gte.' + format(now, 'yyyy-MM-dd'))
        .order('effective_date', { ascending: false })
        .limit(1);

      if (ratesError) throw ratesError;

      // Get pending payments for this week
      const { data: payments, error: paymentsError } = await supabase
        .from('worker_payments')
        .select('gross_pay, status')
        .eq('worker_id', user.id)
        .lte('pay_period_start', format(weekEnd, 'yyyy-MM-dd'))
        .gte('pay_period_end', format(weekStart, 'yyyy-MM-dd'))
        .eq('status', 'pending');

      if (paymentsError) throw paymentsError;

      const totalHours = timeSheets?.reduce((sum, ts) => sum + (ts.hours || 0), 0) || 0;
      const currentRate = rates?.[0];
      
      let estimatedEarnings = 0;
      if (currentRate) {
        if (currentRate.payment_type === 'hourly') {
          // Calculate with overtime (over 40 hours = 1.5x)
          const regularHours = Math.min(totalHours, 40);
          const overtimeHours = Math.max(0, totalHours - 40);
          estimatedEarnings = (regularHours * (currentRate.hourly_rate || 0)) + 
                            (overtimeHours * (currentRate.hourly_rate || 0) * 1.5);
        } else {
          estimatedEarnings = (currentRate.monthly_salary || 0) / 4; // Weekly portion
        }
      }

      const pendingPayments = payments?.reduce((sum, p) => sum + (p.gross_pay || 0), 0) || 0;

      return {
        totalHours,
        estimatedEarnings,
        pendingPayments,
        weekRange: `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd')}`
      };
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5" />
          This Week's Earnings
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {weeklyData?.weekRange}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Hours Worked
            </p>
            <p className="text-2xl font-bold">
              {weeklyData?.totalHours.toFixed(1) || '0.0'}h
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Estimated
            </p>
            <p className="text-2xl font-bold text-green-600">
              ${weeklyData?.estimatedEarnings.toFixed(2) || '0.00'}
            </p>
          </div>
        </div>

        {weeklyData && weeklyData.pendingPayments > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pending Payment</span>
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                ${weeklyData.pendingPayments.toFixed(2)}
              </Badge>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center">
          Overtime calculated at 1.5x rate after 40 hours
        </div>
      </CardContent>
    </Card>
  );
}