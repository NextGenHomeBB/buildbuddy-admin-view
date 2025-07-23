import { Progress } from '@/components/ui/progress';

interface BudgetProgressBarProps {
  budget: number;
  actual: number;
  progress: number;
}

export function BudgetProgressBar({ budget, actual, progress }: BudgetProgressBarProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const budgetProgress = budget > 0 ? (actual / budget) * 100 : 0;
  const isOverBudget = actual > budget;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Budget vs Actual</span>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            Progress: <span className="font-medium text-foreground">{progress.toFixed(0)}%</span>
          </span>
          <span className="text-muted-foreground">
            Budget: <span className="font-medium text-foreground">{formatCurrency(budget)}</span>
          </span>
        </div>
      </div>
      
      <div className="space-y-2">
        {/* Project Progress */}
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Project Progress</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
        </div>

        {/* Budget Progress */}
        <div className="space-y-1">
          <Progress 
            value={Math.min(budgetProgress, 100)} 
            className={`h-2 ${isOverBudget ? '[&>div]:bg-destructive' : ''}`}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Budget Usage</span>
            <span className={isOverBudget ? 'text-destructive font-medium' : ''}>
              {formatCurrency(actual)} / {formatCurrency(budget)} 
              ({budgetProgress.toFixed(0)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}