import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign, Users, TrendingUp, Clock } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { LiveShiftMonitor } from '@/components/admin/LiveShiftMonitor';
import { useWorkerRates, useWorkerPayments, useWorkerExpenses } from '@/hooks/useWorkerCosts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WorkerRatesTab } from '@/components/admin/costs/WorkerRatesTab';
import { PaymentsTab } from '@/components/admin/costs/PaymentsTab';
import { ExpensesTab } from '@/components/admin/costs/ExpensesTab';
import { CostOverviewTab } from '@/components/admin/costs/CostOverviewTab';
import { TimesheetApprovalTable } from '@/components/admin/TimesheetApprovalTable';
import { logger } from '@/utils/logger';

export default function AdminCosts() {
  const [activeTab, setActiveTab] = useState('overview');
  const [recentPayments, setRecentPayments] = useState<string[]>([]);
  
  const { data: rates = [], isLoading: ratesLoading } = useWorkerRates();
  const { data: payments = [], isLoading: paymentsLoading } = useWorkerPayments();
  const { data: expenses = [], isLoading: expensesLoading } = useWorkerExpenses();

  // Set up real-time listener for new payments
  useEffect(() => {
    const channel = supabase
      .channel('worker-payments-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'worker_payments'
        },
        (payload) => {
          logger.debug('New payment created:', payload);
          
          // Mark this payment as "recent" for highlighting
          if (payload.new?.id) {
            setRecentPayments(prev => [...prev, payload.new.id]);
            toast.success('New automatic payment generated from shift');
            
            // Remove the "recent" status after 30 seconds
            setTimeout(() => {
              setRecentPayments(prev => prev.filter(id => id !== payload.new.id));
            }, 30000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Calculate totals for overview cards
  const totalMonthlyPayroll = rates.reduce((sum, rate) => {
    if (rate.payment_type === 'salary' && rate.monthly_salary) {
      return sum + rate.monthly_salary;
    }
    return sum;
  }, 0);

  const pendingPayments = payments.filter(p => p.status === 'pending').length;
  const pendingExpenses = expenses.filter(e => e.status === 'pending').length;
  
  const totalPendingAmount = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + (p.gross_pay || 0), 0) +
    expenses
    .filter(e => e.status === 'pending')
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Cost Management</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Manage worker payments, salaries, and team finances</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">${totalMonthlyPayroll.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total monthly salaries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{rates.length}</div>
            <p className="text-xs text-muted-foreground">
              Workers with rates set
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Items</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{pendingPayments + pendingExpenses}</div>
            <p className="text-xs text-muted-foreground">
              {pendingPayments} payments, {pendingExpenses} expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">${totalPendingAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval/payment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="live" className="text-xs sm:text-sm">Live Shifts</TabsTrigger>
          <TabsTrigger value="rates" className="text-xs sm:text-sm">Rates</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs sm:text-sm">Payments</TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs sm:text-sm">Expenses</TabsTrigger>
          <TabsTrigger value="approvals" className="text-xs sm:text-sm">Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <CostOverviewTab 
            rates={rates}
            payments={payments}
            expenses={expenses}
            isLoading={ratesLoading || paymentsLoading || expensesLoading}
          />
        </TabsContent>

        <TabsContent value="live" className="space-y-4">
          <LiveShiftMonitor />
        </TabsContent>

        <TabsContent value="rates" className="space-y-4">
          <WorkerRatesTab rates={rates} isLoading={ratesLoading} />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <PaymentsTab 
            payments={payments} 
            isLoading={paymentsLoading} 
            recentPayments={recentPayments}
          />
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <ExpensesTab expenses={expenses} isLoading={expensesLoading} />
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          <TimesheetApprovalTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}