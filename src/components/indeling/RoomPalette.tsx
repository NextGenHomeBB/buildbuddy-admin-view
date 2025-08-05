import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Bed, 
  Bath, 
  ChefHat, 
  Sofa, 
  Car,
  Users,
  Briefcase
} from 'lucide-react';

const roomTypes = [
  { name: 'Woonkamer', icon: Sofa, color: 'bg-blue-100 text-blue-700' },
  { name: 'Slaapkamer', icon: Bed, color: 'bg-purple-100 text-purple-700' },
  { name: 'Keuken', icon: ChefHat, color: 'bg-green-100 text-green-700' },
  { name: 'Badkamer', icon: Bath, color: 'bg-cyan-100 text-cyan-700' },
  { name: 'Hal', icon: Home, color: 'bg-gray-100 text-gray-700' },
  { name: 'Garage', icon: Car, color: 'bg-orange-100 text-orange-700' },
  { name: 'Eetkamer', icon: Users, color: 'bg-red-100 text-red-700' },
  { name: 'Kantoor', icon: Briefcase, color: 'bg-indigo-100 text-indigo-700' },
];

export function RoomPalette() {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-3">
        Sleep kamers naar de canvas (binnenkort beschikbaar)
      </p>
      <div className="grid grid-cols-1 gap-2">
        {roomTypes.map((room) => (
          <Button
            key={room.name}
            variant="outline"
            className={`justify-start gap-2 h-auto py-2 ${room.color} border-transparent`}
            disabled
          >
            <room.icon className="h-4 w-4" />
            <span className="text-sm">{room.name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}