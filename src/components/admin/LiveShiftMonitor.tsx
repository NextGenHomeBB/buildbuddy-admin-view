import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Users, DollarSign, AlertTriangle, Coffee, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActiveShift {
  worker_id: string;
  worker_name: string;
  worker_avatar?: string;
  project_name?: string;
  shift_start: string;
  break_duration?: number;
  is_on_break: boolean;
  break_start?: string;
  shift_type: string;
  hourly_rate?: number;
  current_earnings: number;
  hours_today: number;
  overtime: boolean;
}

export function LiveShiftMonitor() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  // Fetch active shifts with real-time updates
  const { data: activeShifts = [], isLoading } = useQuery({
    queryKey: ['active-shifts'],
    queryFn: async (): Promise<ActiveShift[]> => {
      // This would be implemented as an edge function for complex calculations
      // For now, we'll simulate with a basic query
      const { data: shifts, error } = await supabase
        .from('time_sheets')
        .select(`
          *,
          profiles!user_id (
            full_name,
            avatar_url
          ),
          projects (
            name
          )
        `)
        .eq('work_date', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter for ongoing shifts (this is simplified - in reality we'd track active shifts differently)
      return [];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: true,
  });

  // Summary statistics
  const totalActiveWorkers = activeShifts.length;
  const totalLiveCosts = activeShifts.reduce((sum, shift) => sum + shift.current_earnings, 0);
  const overtimeWorkers = activeShifts.filter(shift => shift.overtime).length;
  const workersOnBreak = activeShifts.filter(shift => shift.is_on_break).length;

  const formatDuration = (hours: number) => {
    const totalMinutes = Math.floor(hours * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const getShiftDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const durationMs = now.getTime() - start.getTime();
    return durationMs / (1000 * 60 * 60); // Hours
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Active Workers</p>
                <p className="text-lg font-bold">{totalActiveWorkers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Live Costs</p>
                <p className="text-lg font-bold">${totalLiveCosts.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-xs text-muted-foreground">Overtime</p>
                <p className="text-lg font-bold">{overtimeWorkers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Coffee className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-xs text-muted-foreground">On Break</p>
                <p className="text-lg font-bold">{workersOnBreak}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Shifts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Live Shift Monitor
            <Badge variant="outline" className="ml-auto">
              Updated {formatDistanceToNow(currentTime, { addSuffix: true })}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeShifts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active shifts at the moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeShifts.map((shift) => {
                const shiftDuration = getShiftDuration(shift.shift_start);
                
                return (
                  <div 
                    key={shift.worker_id} 
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={shift.worker_avatar} />
                        <AvatarFallback>
                          {shift.worker_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{shift.worker_name}</h4>
                          <Badge variant={shift.is_on_break ? "secondary" : "default"}>
                            {shift.is_on_break ? 'On Break' : 'Active'}
                          </Badge>
                          {shift.shift_type !== 'regular' && (
                            <Badge variant="outline" className="text-xs">
                              {shift.shift_type}
                            </Badge>
                          )}
                          {shift.overtime && (
                            <Badge variant="outline" className="text-xs text-orange-600">
                              Overtime
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {shift.project_name || 'No project'} • 
                          Started {formatDistanceToNow(new Date(shift.shift_start), { addSuffix: true })}
                        </p>
                        {shift.is_on_break && shift.break_start && (
                          <p className="text-xs text-orange-600">
                            On break since {formatDistanceToNow(new Date(shift.break_start), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Duration</p>
                          <p className="font-medium">{formatDuration(shiftDuration)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Earnings</p>
                          <p className="font-medium text-green-600">
                            ${shift.current_earnings.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Rate</p>
                          <p className="font-medium">
                            ${(shift.hourly_rate || 0).toFixed(2)}/hr
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projected Costs */}
      {activeShifts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Cost Projections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  ${(totalLiveCosts * 8).toFixed(0)}
                </p>
                <p className="text-sm text-muted-foreground">Projected Daily</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  ${(totalLiveCosts * 40).toFixed(0)}
                </p>
                <p className="text-sm text-muted-foreground">Projected Weekly</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  ${(totalLiveCosts * 160).toFixed(0)}
                </p>
                <p className="text-sm text-muted-foreground">Projected Monthly</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}