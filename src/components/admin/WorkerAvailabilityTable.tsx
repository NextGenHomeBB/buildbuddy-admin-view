import { useState } from 'react';
import { Search, Clock, Calendar, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { WorkerWithAvailability } from '@/hooks/useWorkerAvailability';

interface WorkerAvailabilityTableProps {
  workers: WorkerWithAvailability[];
  loading?: boolean;
  onViewWorker: (worker: WorkerWithAvailability) => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WorkerAvailabilityTable({ 
  workers, 
  loading = false, 
  onViewWorker 
}: WorkerAvailabilityTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const filteredWorkers = workers.filter(worker => {
    const matchesSearch = worker.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || worker.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getAvailabilityBadge = (availableDays: number) => {
    if (availableDays === 0) {
      return <Badge variant="destructive">Unavailable</Badge>;
    } else if (availableDays <= 2) {
      return <Badge variant="secondary">Limited</Badge>;
    } else if (availableDays <= 4) {
      return <Badge variant="outline">Partial</Badge>;
    } else {
      return <Badge variant="default">Full Time</Badge>;
    }
  };

  const getWeeklyAvailabilityDisplay = (worker: WorkerWithAvailability) => {
    const availableDays = DAYS_OF_WEEK.map((_, index) => {
      const dayAvailability = worker.weekly_availability.find(wa => wa.day_of_week === index);
      return dayAvailability?.is_available || false;
    });

    return (
      <div className="flex gap-1">
        {DAYS_OF_WEEK.map((day, index) => (
          <div
            key={day}
            className={`w-6 h-6 rounded text-xs flex items-center justify-center text-white font-medium ${
              availableDays[index] 
                ? 'bg-primary' 
                : 'bg-muted-foreground/30'
            }`}
            title={`${day}: ${availableDays[index] ? 'Available' : 'Unavailable'}`}
          >
            {day.charAt(0)}
          </div>
        ))}
      </div>
    );
  };

  const getUpcomingOverrides = (worker: WorkerWithAvailability) => {
    const today = new Date().toISOString().split('T')[0];
    const futureOverrides = worker.date_overrides.filter(override => 
      override.date >= today
    ).slice(0, 3);

    return futureOverrides.length > 0 ? (
      <div className="text-xs text-muted-foreground">
        {futureOverrides.length} upcoming override{futureOverrides.length !== 1 ? 's' : ''}
      </div>
    ) : null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Worker Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Worker Availability Management
        </CardTitle>
        
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">All Roles</option>
            <option value="worker">Worker</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredWorkers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No workers found matching your criteria.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Weekly Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Weekly Hours</TableHead>
                <TableHead>Overrides</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkers.map((worker) => (
                <TableRow key={worker.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={worker.avatar_url} />
                        <AvatarFallback>
                          {worker.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{worker.full_name}</div>
                        <div className="text-sm text-muted-foreground">ID: {worker.id.slice(0, 8)}</div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {worker.role}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    {getWeeklyAvailabilityDisplay(worker)}
                  </TableCell>
                  
                  <TableCell>
                    {getAvailabilityBadge(worker.available_days_count)}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{worker.total_weekly_hours || 0}h</span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {getUpcomingOverrides(worker)}
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewWorker(worker)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}