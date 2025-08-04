import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Download, DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { useProjectCosts } from '@/hooks/useProjectCosts';
import { CostExportModal } from './CostExportModal';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface ProjectCostsTabProps {
  projectId: string;
}

export function ProjectCostsTab({ projectId }: ProjectCostsTabProps) {
  const [showExportModal, setShowExportModal] = useState(false);
  const { data: costs, isLoading, error } = useProjectCosts(projectId);
  // Get current user role
  const { data: userRole } = useQuery({
    queryKey: ['current-user-role'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_current_user_role');
      return data;
    },
  });

  // Check if user has permission to export (admin or manager)
  const canExport = userRole === 'admin' || userRole === 'manager';

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '€0';
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getVarianceColor = (variance: number | null, budget: number | null) => {
    if (!variance || !budget) return 'text-muted-foreground';
    const percentage = (variance / budget) * 100;
    if (percentage > 10) return 'text-success';
    if (percentage < -10) return 'text-destructive';
    return 'text-warning';
  };

  const getVarianceIcon = (variance: number | null) => {
    if (!variance) return null;
    return variance >= 0 ? TrendingUp : TrendingDown;
  };

  const getBudgetProgress = (committed: number, budget: number | null) => {
    if (!budget || budget === 0) return 0;
    return Math.min((committed / budget) * 100, 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">Project Costs</h2>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">Project Costs</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>Failed to load cost data</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!costs) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">Project Costs</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No cost data available for this project</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const budgetProgress = getBudgetProgress(costs.total_committed, costs.budget);
  const VarianceIcon = getVarianceIcon(costs.variance);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Project Costs</h2>
        {canExport && (
          <Button onClick={() => setShowExportModal(true)} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Budget Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(costs.budget)}
            </div>
            {costs.budget && (
              <Progress value={budgetProgress} className="mt-2" />
            )}
          </CardContent>
        </Card>

        {/* Committed Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Committed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(costs.total_committed)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {costs.budget 
                ? `${((costs.total_committed / costs.budget) * 100).toFixed(1)}% of budget`
                : 'No budget set'
              }
            </p>
          </CardContent>
        </Card>

        {/* Forecast Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(costs.forecast)}
            </div>
            <Badge variant="secondary" className="mt-1">
              Current = Committed
            </Badge>
          </CardContent>
        </Card>

        {/* Variance Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              {VarianceIcon && <VarianceIcon className="h-4 w-4 mr-2" />}
              Variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getVarianceColor(costs.variance, costs.budget)}`}>
              {formatCurrency(costs.variance)}
            </div>
            {costs.budget && costs.variance !== null && (
              <p className="text-xs text-muted-foreground mt-1">
                {((costs.variance / costs.budget) * 100).toFixed(1)}% of budget
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Labor Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {formatCurrency(costs.labor_cost)}
            </div>
            <p className="text-xs text-muted-foreground">
              {costs.total_hours} hours worked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Material Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {formatCurrency(costs.material_cost)}
            </div>
            <p className="text-xs text-muted-foreground">
              Project materials
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expense Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {formatCurrency(costs.expense_cost)}
            </div>
            <p className="text-xs text-muted-foreground">
              Approved expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Last Updated */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date(costs.last_updated).toLocaleString()}
          </p>
        </CardContent>
      </Card>

      {/* Export Modal */}
      {showExportModal && (
        <CostExportModal
          projectId={projectId}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}