import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface CostSummaryProps {
  estimate?: {
    materials: any[];
    totalCost: number;
    breakdown: {
      [category: string]: {
        items: any[];
        subtotal: number;
      };
    };
    currency: string;
  };
}

export function CostSummary({ estimate }: CostSummaryProps) {
  if (!estimate) {
    return (
      <div className="text-sm text-muted-foreground">
        Geen kostenoverzicht beschikbaar
      </div>
    );
  }

  const categories = Object.entries(estimate.breakdown);
  const maxSubtotal = Math.max(...categories.map(([_, data]) => data.subtotal));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Totaal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            €{estimate.totalCost.toFixed(2)}
          </div>
          <div className="text-sm text-muted-foreground">
            {estimate.materials.length} materialen
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h4 className="font-medium">Kosten per Categorie</h4>
        {categories.map(([category, data]) => {
          const percentage = (data.subtotal / maxSubtotal) * 100;
          
          return (
            <div key={category} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{category}</span>
                <Badge variant="secondary">
                  €{data.subtotal.toFixed(2)}
                </Badge>
              </div>
              <Progress value={percentage} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {data.items.length} materialen
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}