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
  const { currentOrg, memberships, loading, switchOrganization } = useOrganization();

  if (loading) {
    return (
      <div className="h-10 w-48 bg-muted animate-pulse rounded-md" />
    );
  }

  if (!currentOrg) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 justify-between min-w-[200px]">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span className="font-medium truncate">{currentOrg.name}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {memberships.map((membership) => {
          const RoleIcon = roleIcons[membership.role as keyof typeof roleIcons];
          const isExpiring = membership.expires_at && 
            new Date(membership.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          
          return (
            <DropdownMenuItem
              key={membership.id}
              onClick={() => switchOrganization(membership.org_id)}
              className={`cursor-pointer ${
                currentOrg.id === membership.org_id ? 'bg-accent' : ''
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <span className="font-medium">{membership.organization.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  {isExpiring && (
                    <Badge variant="outline" className="text-xs">
                      Expiring
                    </Badge>
                  )}
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${roleColors[membership.role as keyof typeof roleColors]}`}
                  >
                    <RoleIcon className="h-3 w-3 mr-1" />
                    {membership.role}
                  </Badge>
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}