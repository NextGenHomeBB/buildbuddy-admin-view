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

  // Calculate dimensions and scaling
  const canvasWidth = 400; // Available width
  const canvasHeight = 400; // Available height
  const padding = 40; // Padding around the floor plan
  const availableWidth = canvasWidth - (padding * 2);
  const availableHeight = canvasHeight - (padding * 2) - 60; // Extra space for header
  
  // Find the bounds of the floor plan
  const maxX = Math.max(...planData.rooms.map(room => room.x + room.width));
  const maxY = Math.max(...planData.rooms.map(room => room.y + room.height));
  const minX = Math.min(...planData.rooms.map(room => room.x));
  const minY = Math.min(...planData.rooms.map(room => room.y));
  
  // Calculate actual floor plan dimensions
  const floorPlanWidth = maxX - minX;
  const floorPlanHeight = maxY - minY;
  
  // Calculate scale to fit within available space, with minimum scale
  const scaleX = availableWidth / floorPlanWidth;
  const scaleY = availableHeight / floorPlanHeight;
  const scale = Math.max(Math.min(scaleX, scaleY), 8); // Minimum scale of 8 pixels per meter
  
  // Calculate actual display dimensions
  const displayWidth = floorPlanWidth * scale;
  const displayHeight = floorPlanHeight * scale;
  
  // Debug logging
  console.log('Floor plan debug:', {
    originalDimensions: { width: floorPlanWidth, height: floorPlanHeight },
    availableSpace: { width: availableWidth, height: availableHeight },
    scale,
    displayDimensions: { width: displayWidth, height: displayHeight }
  });

  return (
    <div className="w-full h-[400px] border border-border rounded-lg bg-background relative overflow-hidden">
      <div className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur-sm rounded px-2 py-1">
        <h3 className="font-semibold text-sm">{activePlan.name}</h3>
        <p className="text-xs text-muted-foreground">
          {activePlan.total_area ? `${activePlan.total_area} m²` : ''}
        </p>
      </div>
      
      <div 
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border border-border/20 rounded"
        style={{
          width: `${displayWidth}px`,
          height: `${displayHeight}px`,
        }}
      >
        {planData.rooms.map((room, index) => {
          const roomWidth = room.width * scale;
          const roomHeight = room.height * scale;
          const isSmallRoom = roomWidth < 60 || roomHeight < 40;
          
          return (
            <div
              key={index}
              className={`absolute border ${getColorForRoomType(room.type)} flex items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer group`}
              style={{
                left: `${(room.x - minX) * scale}px`,
                top: `${(room.y - minY) * scale}px`,
                width: `${roomWidth}px`,
                height: `${roomHeight}px`,
              }}
              title={`${room.name} - ${Math.round(room.width)}×${Math.round(room.height)}m (${Math.round(room.width * room.height)}m²)`}
            >
              {!isSmallRoom ? (
                <div className="p-1">
                  <div className="font-semibold text-xs leading-tight">{room.name}</div>
                  <div className="text-xs opacity-75 leading-tight mt-1">
                    {Math.round(room.width)}×{Math.round(room.height)}m
                  </div>
                </div>
              ) : (
                <div className="text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 px-1 py-0.5 rounded text-center">
                  {room.name}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Scale indicator */}
      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded px-2 py-1">
        Scale: 1m = {Math.round(scale)}px
      </div>
    </div>
  );
}