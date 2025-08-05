import React from 'react';
import { usePlanStore } from '@/store/planStore';
import { useFloorPlans } from '@/hooks/useFloorPlans';

export function CanvasArea() {
  const { activePlanId } = usePlanStore();
  const { data: plans } = useFloorPlans();
  
  const activePlan = plans?.find(plan => plan.id === activePlanId);

  return (
    <div className="w-full h-[400px] border border-border rounded-lg bg-muted/10 flex items-center justify-center">
      {activePlan ? (
        <div className="text-center">
          <h3 className="font-semibold">{activePlan.name}</h3>
          <p className="text-sm text-muted-foreground mt-2">
            {activePlan.total_area ? `${activePlan.total_area} m²` : 'Geen oppervlakte'}
          </p>
          <div className="mt-4 text-xs text-muted-foreground">
            Canvas editor komt binnenkort
          </div>
        </div>
      ) : (
        <div className="text-center text-muted-foreground">
          <p>Geen plattegrond geladen</p>
          <p className="text-sm mt-1">Gebruik de AI prompt om een plattegrond te genereren</p>
        </div>
      )}
    </div>
  );
}