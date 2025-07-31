import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useShiftTracker } from '@/hooks/useShiftTracker';
import { DollarSign, Clock, TrendingUp, AlertCircle, Calendar } from 'lucide-react';
import { startOfWeek, endOfWeek, format } from 'date-fns';

interface WeeklyData {
  totalHours: number;
  estimatedEarnings: number;
  pendingPayments: number;
  weekRange: string;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  averageDaily: number;
  projectedWeekly: number;
}

export function WeeklyEarnings() {
  const { user } = useAuth();
  const { isShiftActive, getCurrentShiftDuration, getLiveEarnings } = useShiftTracker();

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
      let regularHours = 0;
      let overtimeHours = 0;
      let regularPay = 0;
      let overtimePay = 0;
      
      if (currentRate) {
        if (currentRate.payment_type === 'hourly') {
          const rate = currentRate.hourly_rate || 0;
          regularHours = Math.min(totalHours, 40);
          overtimeHours = Math.max(0, totalHours - 40);
          regularPay = regularHours * rate;
          overtimePay = overtimeHours * rate * 1.5;
          estimatedEarnings = regularPay + overtimePay;
        } else {
          estimatedEarnings = (currentRate.monthly_salary || 0) / 4; // Weekly portion
          regularPay = estimatedEarnings;
        }
      }

      const pendingPayments = payments?.reduce((sum, p) => sum + (p.gross_pay || 0), 0) || 0;
      
      // Calculate averages and projections
      const daysWorked = timeSheets?.length || 0;
      const averageDaily = daysWorked > 0 ? estimatedEarnings / daysWorked : 0;
      const daysRemaining = 5 - daysWorked; // Assuming 5-day work week
      const projectedWeekly = estimatedEarnings + (averageDaily * daysRemaining);

      return {
        totalHours,
        estimatedEarnings,
        pendingPayments,
        weekRange: `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd')}`,
        regularHours,
        overtimeHours,
        regularPay,
        overtimePay,
        averageDaily,
        projectedWeekly
      };
    },
    enabled: !!user?.id,
    refetchInterval: isShiftActive ? 60000 : 300000, // Refresh every minute if active, 5 minutes if not
  });

  // Include current shift in calculations if active
  const liveEarnings = getLiveEarnings();
  const currentShiftHours = getCurrentShiftDuration();
  
  const adjustedData = weeklyData ? {
    ...weeklyData,
    totalHours: weeklyData.totalHours + (isShiftActive ? currentShiftHours : 0),
    estimatedEarnings: weeklyData.estimatedEarnings + (isShiftActive ? liveEarnings.currentShiftEarnings : 0)
  } : null;

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
          {isShiftActive && (
            <Badge variant="default" className="text-xs animate-pulse">
              Live
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {adjustedData?.weekRange}
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
              {adjustedData?.totalHours.toFixed(1) || '0.0'}h
              {isShiftActive && (
                <span className="text-sm text-green-600 ml-1">+{currentShiftHours.toFixed(1)}</span>
              )}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {isShiftActive ? 'Live Earnings' : 'Estimated'}
            </p>
            <p className="text-2xl font-bold text-green-600">
              ${adjustedData?.estimatedEarnings.toFixed(2) || '0.00'}
            </p>
          </div>
        </div>

        {/* Detailed Breakdown */}
        {weeklyData && (
          <div className="space-y-3 pt-3 border-t">
            {weeklyData.overtimeHours > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <p className="text-sm font-medium text-orange-800">Overtime Alert</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-orange-700">Regular: {weeklyData.regularHours.toFixed(1)}h</p>
                    <p className="text-orange-600">${weeklyData.regularPay.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-orange-700">OT: {weeklyData.overtimeHours.toFixed(1)}h</p>
                    <p className="text-orange-600">${weeklyData.overtimePay.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Projections */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-800">Weekly Projection</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-blue-700">Daily Avg</p>
                  <p className="text-blue-600">${weeklyData.averageDaily.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-blue-700">Week End Est.</p>
                  <p className="text-blue-600">${weeklyData.projectedWeekly.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {adjustedData && adjustedData.pendingPayments > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pending Payment</span>
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                ${adjustedData.pendingPayments.toFixed(2)}
              </Badge>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center">
          {isShiftActive ? 'Live calculations include current shift' : 'Overtime calculated at 1.5x rate after 40 hours'}
        </div>
      </CardContent>
    </Card>
  );
}