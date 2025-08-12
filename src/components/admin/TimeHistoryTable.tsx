import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { Clock, Calendar, DollarSign, Filter } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface TimeSheetEntry {
  id: string;
  user_id: string;
  project_id: string | null;
  work_date: string;
  hours: number;
  break_duration: number;
  shift_type: string;
  note: string | null;
  approval_status: string;
  approved_at: string | null;
  created_at: string;
  profiles: {
    full_name: string;
  } | null;
  projects: {
    name: string;
  } | null;
}

export function TimeHistoryTable() {
  const [filterDays, setFilterDays] = useState(7);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('all');
  const [selectedShiftType, setSelectedShiftType] = useState<string>('all');
  const isMobile = useIsMobile();

  // Fetch workers list for the dropdown
  const { data: workers = [] } = useQuery({
    queryKey: ['workers-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: timesheets = [], isLoading } = useQuery({
    queryKey: ['timesheet-history', filterDays, selectedWorkerId, selectedShiftType],
    queryFn: async (): Promise<TimeSheetEntry[]> => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - filterDays);
      
      let query = supabase
        .from('time_sheets')
        .select(`
          *,
          profiles:user_id(full_name),
          projects:project_id(name)
        `)
        .gte('work_date', startDate.toISOString().split('T')[0]);

      // Apply worker filter
      if (selectedWorkerId !== 'all') {
        query = query.eq('user_id', selectedWorkerId);
      }

      // Apply shift type filter
      if (selectedShiftType !== 'all') {
        query = query.eq('shift_type', selectedShiftType);
      }

      const { data, error } = await query
        .order('work_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return <SkeletonCard />;
  }

  const totalHours = timesheets.reduce((sum, entry) => sum + entry.hours, 0);
  const totalEntries = timesheets.length;
  const avgHoursPerDay = totalEntries > 0 ? totalHours / Math.max(filterDays, 1) : 0;
  
  const selectedWorkerName = selectedWorkerId === 'all' 
    ? 'All Workers' 
    : workers.find(w => w.id === selectedWorkerId)?.full_name || 'Unknown Worker';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Worker</label>
              <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select worker" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workers</SelectItem>
                  {workers.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.full_name || 'Unknown Worker'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Shift Type</label>
              <Select value={selectedShiftType} onValueChange={setSelectedShiftType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shift type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="overtime">Overtime</SelectItem>
                  <SelectItem value="weekend">Weekend</SelectItem>
                  <SelectItem value="holiday">Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              {selectedWorkerName} - Last {filterDays} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Entries</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEntries}</div>
            <p className="text-xs text-muted-foreground">
              Total shifts recorded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgHoursPerDay.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Hours per day
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {[7, 14, 30].map((days) => (
          <Button
            key={days}
            variant={filterDays === days ? "default" : "outline"}
            size={isMobile ? "sm" : "sm"}
            onClick={() => setFilterDays(days)}
            className="flex-1 sm:flex-none min-w-0"
          >
            Last {days} days
          </Button>
        ))}
      </div>

      {/* Time History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Time Sheet History</CardTitle>
          <CardDescription>
            {selectedWorkerId === 'all' 
              ? 'Automatically approved time entries for all workers'
              : `Time entries for ${selectedWorkerName}`}
            {selectedShiftType !== 'all' && ` - ${selectedShiftType} shifts only`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {isMobile ? (
            // Mobile card view
            <div className="space-y-3 p-4">
              {timesheets.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No time entries found for {selectedWorkerName} in the last {filterDays} days
                  {selectedShiftType !== 'all' && ` with ${selectedShiftType} shift type`}
                </div>
              ) : (
                timesheets.map((entry) => (
                  <Card key={entry.id} className="border border-border">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h4 className="font-medium text-sm">
                            {entry.profiles?.full_name || 'Unknown Worker'}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(entry.work_date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="font-medium text-sm">{entry.hours.toFixed(1)}h</div>
                          {entry.break_duration > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Break: {Math.round(entry.break_duration)}min
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Project: </span>
                          <span className="font-medium">{entry.projects?.name || 'No Project'}</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={entry.shift_type === 'overtime' ? 'destructive' : 'secondary'} className="text-xs">
                            {entry.shift_type || 'regular'}
                          </Badge>
                          <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                            Auto-Approved
                          </Badge>
                        </div>
                        
                        {entry.note && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Notes: </span>
                            <span>{entry.note}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            // Desktop table view
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timesheets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No time entries found for {selectedWorkerName} in the last {filterDays} days
                        {selectedShiftType !== 'all' && ` with ${selectedShiftType} shift type`}
                      </TableCell>
                    </TableRow>
                  ) : (
                    timesheets.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {entry.profiles?.full_name || 'Unknown Worker'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(entry.work_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          {entry.projects?.name || 'No Project'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{entry.hours.toFixed(1)}h</span>
                            {entry.break_duration > 0 && (
                              <span className="text-xs text-muted-foreground">
                                Break: {Math.round(entry.break_duration)}min
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.shift_type === 'overtime' ? 'destructive' : 'secondary'}>
                            {entry.shift_type || 'regular'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-green-600 border-green-200">
                            Auto-Approved
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <span className="text-sm text-muted-foreground truncate">
                            {entry.note || '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}