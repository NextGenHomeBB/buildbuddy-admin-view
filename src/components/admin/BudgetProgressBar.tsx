
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Budget & Progress</h3>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Progress</p>
            <p className="text-lg font-bold text-foreground">{progress.toFixed(0)}%</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Budget</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(budget)}</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Project Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">Project Progress</span>
            <span className="text-sm font-semibold text-foreground">{progress.toFixed(0)}%</span>
          </div>
          <div className="relative">
            <Progress value={progress} className="h-3" />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-full" />
          </div>
        </div>

        {/* Budget Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">Budget Usage</span>
            <span className={`text-sm font-semibold ${isOverBudget ? 'text-destructive' : 'text-foreground'}`}>
              {formatCurrency(actual)} / {formatCurrency(budget)} ({budgetProgress.toFixed(0)}%)
            </span>
          </div>
          <div className="relative">
            <Progress 
              value={Math.min(budgetProgress, 100)} 
              className={`h-3 ${isOverBudget ? '[&>div]:bg-destructive' : ''}`}
            />
            <div className={`absolute inset-0 rounded-full ${
              isOverBudget 
                ? 'bg-gradient-to-r from-red-500/20 to-red-600/20' 
                : 'bg-gradient-to-r from-green-500/20 to-green-600/20'
            }`} />
          </div>
        </div>
      </div>
    </div>
  );
}
