import React from 'react';
import { useFloorPlans } from '@/hooks/useFloorPlans';
import { usePlanStore } from '@/store/planStore';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { FileText } from 'lucide-react';

export function PlanHistory() {
  const { data: plans, isLoading } = useFloorPlans();
  const { activePlanId, setActivePlanId } = usePlanStore();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Laden...</div>;
  }

  if (!plans?.length) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Nog geen plattegronden gegenereerd
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {plans.map((plan) => (
        <Button
          key={plan.id}
          variant={activePlanId === plan.id ? "default" : "ghost"}
          className="w-full justify-start text-left h-auto py-2 px-3"
          onClick={() => setActivePlanId(plan.id)}
        >
          <div className="flex items-start gap-2 w-full">
            <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm truncate">{plan.name}</div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(plan.created_at), {
                  addSuffix: true,
                  locale: nl
                })}
              </div>
              {plan.total_area && (
                <div className="text-xs text-muted-foreground">
                  {plan.total_area} m²
                </div>
              )}
            </div>
          </div>
        </Button>
      ))}
    </div>
  );
}