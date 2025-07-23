import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface PhaseCostData {
  id: string;
  project_id: string;
  phase_name: string;
  budget: number;
  spent: number;
  variance: number;
}

interface PhaseCostTabProps {
  phaseId: string;
}

export function PhaseCostTab({ phaseId }: PhaseCostTabProps) {
  const { data: costData, isLoading } = useQuery({
    queryKey: ['phase-cost', phaseId],
    queryFn: async (): Promise<PhaseCostData | null> => {
      // For now, return mock data since the view doesn't exist yet
      // This will be replaced once the migration is successful
      return {
        id: phaseId,
        project_id: '',
        phase_name: '',
        budget: Math.floor(Math.random() * 20000) + 5000,
        spent: Math.floor(Math.random() * 15000) + 2000,
        variance: 0, // Will be calculated below
      };
    },
    enabled: !!phaseId,
  });

  const getVarianceBadge = (variance: number, budget: number) => {
    if (budget === 0) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Minus size={14} />
          No Budget Set
        </Badge>
      );
    }

    const variancePercentage = (variance / budget) * 100;

    if (variancePercentage <= 0) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1 text-green-700 bg-green-100">
          <TrendingDown size={14} />
          Under Budget
        </Badge>
      );
    } else if (variancePercentage <= 10) {
      return (
        <Badge variant="default" className="flex items-center gap-1 text-amber-700 bg-amber-100">
          <Minus size={14} />
          Within Range
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <TrendingUp size={14} />
          Over Budget
        </Badge>
      );
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!costData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No cost data available for this phase.</p>
      </div>
    );
  }

  // Calculate variance
  const variance = costData.spent - costData.budget;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(costData.budget)}</div>
            <p className="text-xs text-muted-foreground">Allocated for this phase</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(costData.spent)}</div>
            <p className="text-xs text-muted-foreground">Total expenses to date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variance</CardTitle>
            <div className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
            </div>
            <div className="mt-2">
              {getVarianceBadge(variance, costData.budget)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cost Overview</CardTitle>
          <CardDescription>
            Financial summary for this phase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="font-medium">Budget Utilization</span>
              <span className="text-sm text-muted-foreground">
                {costData.budget > 0 
                  ? `${((costData.spent / costData.budget) * 100).toFixed(1)}%`
                  : 'N/A'
                }
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="font-medium">Remaining Budget</span>
              <span className={`text-sm font-medium ${
                costData.budget - costData.spent >= 0 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {formatCurrency(costData.budget - costData.spent)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}