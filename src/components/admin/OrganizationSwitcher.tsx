import React from 'react';
import { ChevronDown, Building, Crown, Shield, Users, Wrench, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/contexts/OrganizationContext';

const roleIcons = {
  owner: Crown,
  admin: Shield,
  manager: Users,
  worker: Wrench,
  contractor: Clock
};

const roleColors = {
  owner: 'bg-yellow-100 text-yellow-800',
  admin: 'bg-red-100 text-red-800',
  manager: 'bg-blue-100 text-blue-800',
  worker: 'bg-green-100 text-green-800',
  contractor: 'bg-orange-100 text-orange-800'
};

export function OrganizationSwitcher() {
  const { currentOrg, loading } = useOrganization();

  if (loading) {
    return (
      <div className="h-10 w-48 bg-muted animate-pulse rounded-md" />
    );
  }

  if (!currentOrg) {
    return null;
  }

  // For single-org scoping, this is now just a display component
  return (
    <div className="flex items-center gap-2 h-10 px-3 py-2 bg-muted/50 rounded-md">
      <Building className="h-4 w-4" />
      <span className="font-medium text-sm">{currentOrg.name}</span>
    </div>
  );
}