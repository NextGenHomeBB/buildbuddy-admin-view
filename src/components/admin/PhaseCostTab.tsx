import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Plus, Edit2, Save, X, AlertTriangle } from 'lucide-react';
import { usePhaseCosts, useUpdatePhaseBudget } from '@/hooks/usePhaseCosts';
import { AddMaterialCostDialog } from '@/components/admin/costs/AddMaterialCostDialog';
import { AddLaborCostDialog } from '@/components/admin/costs/AddLaborCostDialog';
import { AddExpenseDialog } from '@/components/admin/costs/AddExpenseDialog';

interface PhaseCostTabProps {
  phaseId: string;
}

export function PhaseCostTab({ phaseId }: PhaseCostTabProps) {
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetValue, setBudgetValue] = useState('');
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [showLaborDialog, setShowLaborDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);

  const { data: costs, isLoading } = usePhaseCosts(phaseId);
  const updateBudget = useUpdatePhaseBudget();

  const handleEditBudget = () => {
    setBudgetValue(costs?.budget?.toString() || '0');
    setEditingBudget(true);
  };

  const handleSaveBudget = () => {
    const budget = parseFloat(budgetValue) || 0;
    updateBudget.mutate({ phaseId, budget }, {
      onSuccess: () => {
        setEditingBudget(false);
      },
    });
  };

  const handleCancelEdit = () => {
    setEditingBudget(false);
    setBudgetValue('');
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-4 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!costs) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No cost data available for this phase.
      </div>
    );
  }

  const getVarianceBadge = (variance: number | null, budget: number | null) => {
    if (!budget || budget === 0) return null;
    if (variance === null) return null;
    
    const percentageVariance = (variance / budget) * 100;
    
    if (percentageVariance > 10) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Under Budget</Badge>;
    } else if (percentageVariance >= -10) {
      return <Badge variant="secondary">Within Range</Badge>;
    } else {
      return <Badge variant="destructive">Over Budget</Badge>;
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '€0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const budgetProgress = costs.budget && costs.budget > 0 
    ? Math.min((costs.total_committed / costs.budget) * 100, 100) 
    : 0;

  const isOverBudget = costs.budget && costs.total_committed > costs.budget;

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button 
          onClick={() => setShowMaterialDialog(true)}
          size="sm" 
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Material
        </Button>
        <Button 
          onClick={() => setShowLaborDialog(true)}
          size="sm" 
          variant="outline" 
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Labor
        </Button>
        <Button 
          onClick={() => setShowExpenseDialog(true)}
          size="sm" 
          variant="outline" 
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {/* Cost Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget</CardTitle>
            {!editingBudget && (
              <Button variant="ghost" size="sm" onClick={handleEditBudget}>
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editingBudget ? (
              <div className="space-y-2">
                <Input
                  type="number"
                  value={budgetValue}
                  onChange={(e) => setBudgetValue(e.target.value)}
                  placeholder="Enter budget"
                  className="text-xl font-bold"
                />
                <div className="flex gap-1">
                  <Button size="sm" onClick={handleSaveBudget} disabled={updateBudget.isPending}>
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(costs.budget)}</div>
                <p className="text-xs text-muted-foreground">
                  Total allocated budget
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Committed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(costs.total_committed)}</div>
            <p className="text-xs text-muted-foreground">
              Total costs committed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(costs.forecast)}</div>
            <p className="text-xs text-muted-foreground">
              Projected total cost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(costs.variance)}</div>
            <div className="flex items-center gap-2 mt-1">
              {getVarianceBadge(costs.variance, costs.budget)}
              {isOverBudget && <AlertTriangle className="h-4 w-4 text-destructive" />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Material Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(costs.material_cost)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Labor Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(costs.labor_cost_actual)}</div>
            <p className="text-xs text-muted-foreground">
              Planned: {formatCurrency(costs.labor_cost_planned)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Other Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(costs.expense_cost)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress */}
      {costs.budget && costs.budget > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Budget Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Budget Utilization</span>
              <span className={isOverBudget ? 'text-destructive font-bold' : ''}>
                {budgetProgress.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={budgetProgress} 
              className={`w-full ${isOverBudget ? 'bg-destructive/20' : ''}`}
            />
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Remaining: {formatCurrency(Math.max(0, costs.budget - costs.total_committed))}</span>
              <span>Total: {formatCurrency(costs.budget)}</span>
            </div>
            {isOverBudget && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>Budget exceeded by {formatCurrency(costs.total_committed - costs.budget)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-muted-foreground">
        Last updated: {new Date(costs.last_updated).toLocaleString()}
      </div>

      {/* Dialogs */}
      <AddMaterialCostDialog
        isOpen={showMaterialDialog}
        onClose={() => setShowMaterialDialog(false)}
        phaseId={phaseId}
      />
      <AddLaborCostDialog
        isOpen={showLaborDialog}
        onClose={() => setShowLaborDialog(false)}
        phaseId={phaseId}
      />
      <AddExpenseDialog
        isOpen={showExpenseDialog}
        onClose={() => setShowExpenseDialog(false)}
        phaseId={phaseId}
      />
    </div>
  );
}