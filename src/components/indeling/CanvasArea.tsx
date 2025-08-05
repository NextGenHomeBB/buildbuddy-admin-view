import React from 'react';
import { usePlanStore } from '@/store/planStore';
import { useFloorPlans } from '@/hooks/useFloorPlans';

interface Room {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
}

export function CanvasArea() {
  const { activePlanId } = usePlanStore();
  const { data: plans } = useFloorPlans();
  
  const activePlan = plans?.find(plan => plan.id === activePlanId);
  const planData = activePlan?.plan_data as { rooms?: Room[], totalArea?: number } | null;

  const getColorForRoomType = (type: string) => {
    const colors: Record<string, string> = {
      'woonkamer': 'bg-blue-200 border-blue-400',
      'keuken': 'bg-green-200 border-green-400',
      'slaapkamer': 'bg-purple-200 border-purple-400',
      'badkamer': 'bg-cyan-200 border-cyan-400',
      'hal': 'bg-gray-200 border-gray-400',
      'berging': 'bg-orange-200 border-orange-400',
      'toilet': 'bg-pink-200 border-pink-400',
      'gang': 'bg-yellow-200 border-yellow-400',
      'default': 'bg-slate-200 border-slate-400'
    };
    return colors[type.toLowerCase()] || colors.default;
  };

  if (!activePlan) {
    return (
      <div className="w-full h-[400px] border border-border rounded-lg bg-muted/10 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Geen plattegrond geladen</p>
          <p className="text-sm mt-1">Gebruik de AI prompt om een plattegrond te genereren</p>
        </div>
      </div>
    );
  }

  if (!planData?.rooms || planData.rooms.length === 0) {
    return (
      <div className="w-full h-[400px] border border-border rounded-lg bg-muted/10 flex items-center justify-center">
        <div className="text-center">
          <h3 className="font-semibold">{activePlan.name}</h3>
          <p className="text-sm text-muted-foreground mt-2">
            {activePlan.total_area ? `${activePlan.total_area} m²` : 'Geen oppervlakte'}
          </p>
          <div className="mt-4 text-xs text-muted-foreground">
            Geen kamerindeling beschikbaar
          </div>
        </div>
      </div>
    );
  }

  // Calculate scale to fit the floor plan in the canvas
  const maxX = Math.max(...planData.rooms.map(room => room.x + room.width));
  const maxY = Math.max(...planData.rooms.map(room => room.y + room.height));
  const scaleX = 350 / maxX;
  const scaleY = 350 / maxY;
  const scale = Math.min(scaleX, scaleY, 1);

  return (
    <div className="w-full h-[400px] border border-border rounded-lg bg-background relative overflow-hidden">
      <div className="absolute top-4 left-4 z-10">
        <h3 className="font-semibold text-sm">{activePlan.name}</h3>
        <p className="text-xs text-muted-foreground">
          {activePlan.total_area ? `${activePlan.total_area} m²` : ''}
        </p>
      </div>
      
      <div 
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        style={{
          width: `${maxX * scale}px`,
          height: `${maxY * scale}px`,
        }}
      >
        {planData.rooms.map((room, index) => (
          <div
            key={index}
            className={`absolute border-2 ${getColorForRoomType(room.type)} flex items-center justify-center text-xs font-medium text-center p-1`}
            style={{
              left: `${room.x * scale}px`,
              top: `${room.y * scale}px`,
              width: `${room.width * scale}px`,
              height: `${room.height * scale}px`,
            }}
          >
            <div>
              <div className="font-semibold">{room.name}</div>
              <div className="text-xs opacity-75">
                {Math.round(room.width)}×{Math.round(room.height)}m
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}