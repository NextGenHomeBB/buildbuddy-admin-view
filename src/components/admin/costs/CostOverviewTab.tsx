import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { WorkerRate, WorkerPayment, WorkerExpense } from '@/hooks/useWorkerCosts';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface CostOverviewTabProps {
  rates: WorkerRate[];
  payments: WorkerPayment[];
  expenses: WorkerExpense[];
  isLoading: boolean;
}

export function CostOverviewTab({ rates, payments, expenses, isLoading }: CostOverviewTabProps) {
  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Calculate monthly costs
  const thisMonthPayments = payments.filter(p => 
    isWithinInterval(new Date(p.pay_period_start), { start: monthStart, end: monthEnd })
  );
  
  const thisMonthExpenses = expenses.filter(e => 
    isWithinInterval(new Date(e.expense_date), { start: monthStart, end: monthEnd })
  );

  const monthlyPayrollCost = thisMonthPayments.reduce((sum, p) => sum + (p.gross_pay || 0), 0);
  const monthlyExpenseCost = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalMonthlyCost = monthlyPayrollCost + monthlyExpenseCost;

  // Calculate breakdown by payment type
  const paymentTypeBreakdown = rates.reduce((acc, rate) => {
    acc[rate.payment_type] = (acc[rate.payment_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Recent activity
  const recentPayments = payments
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const recentExpenses = expenses
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Monthly Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month's Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${monthlyPayrollCost.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {thisMonthPayments.length} payment records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month's Expenses</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${monthlyExpenseCost.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {thisMonthExpenses.length} expense claims
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Monthly Cost</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalMonthlyCost.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Payroll + Expenses for {format(currentMonth, 'MMMM yyyy')}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Payment Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Worker Payment Types</CardTitle>
            <CardDescription>Breakdown of payment structures</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(paymentTypeBreakdown).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="capitalize">
                      {type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {count} worker{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-sm font-medium">
                    {((count / rates.length) * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
              {rates.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No worker rates configured yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest payments and expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPayments.slice(0, 3).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{payment.profiles?.full_name}</span>
                    <span className="text-muted-foreground ml-2">payment</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>${payment.net_pay?.toLocaleString()}</span>
                    <Badge 
                      variant="secondary" 
                      className={
                        payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                        payment.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
              
              {recentExpenses.slice(0, 2).map((expense) => (
                <div key={expense.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{expense.profiles?.full_name}</span>
                    <span className="text-muted-foreground ml-2">expense</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>${expense.amount.toLocaleString()}</span>
                    <Badge 
                      variant="secondary"
                      className={
                        expense.status === 'approved' ? 'bg-green-100 text-green-800' :
                        expense.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {expense.status}
                    </Badge>
                  </div>
                </div>
              ))}
              
              {recentPayments.length === 0 && recentExpenses.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}