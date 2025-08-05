import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Settings
} from 'lucide-react';
import { format, addDays, startOfWeek, eachDayOfInterval } from 'date-fns';

interface Worker {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string;
}

interface Shift {
  id: string;
  task_id: string;
  worker_id: string;
  start_time: string;
  end_time: string;
  status: string;
  task?: { title: string };
  worker?: { full_name: string };
}

interface WorkforceOverviewProps {
  workers: Worker[];
  shifts: Shift[];
  selectedWeek: Date;
  onWeekChange: (week: Date) => void;
}

export function WorkforceOverview({ 
  workers, 
  shifts, 
  selectedWeek, 
  onWeekChange 
}: WorkforceOverviewProps) {
  const weekDays = eachDayOfInterval({
    start: startOfWeek(selectedWeek),
    end: addDays(startOfWeek(selectedWeek), 6)
  });

  // Calculate worker statistics
  const getWorkerStats = (workerId: string) => {
    const workerShifts = shifts.filter(s => s.worker_id === workerId);
    const weekShifts = workerShifts.filter(s => {
      const shiftDate = new Date(s.start_time);
      return shiftDate >= startOfWeek(selectedWeek) && 
             shiftDate <= addDays(startOfWeek(selectedWeek), 6);
    });

    const totalHours = weekShifts.reduce((total, shift) => {
      const start = new Date(shift.start_time);
      const end = new Date(shift.end_time);
      return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);

    const utilization = Math.min(totalHours / 40 * 100, 100); // 40-hour standard week
    const overtimeHours = Math.max(totalHours - 40, 0);
    
    return {
      totalHours,
      utilization,
      overtimeHours,
      shiftsCount: weekShifts.length,
      confirmedShifts: weekShifts.filter(s => s.status === 'confirmed').length
    };
  };

  // Get availability for a worker on a specific day
  const getWorkerAvailability = (workerId: string, day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayShifts = shifts.filter(s => 
      s.worker_id === workerId &&
      format(new Date(s.start_time), 'yyyy-MM-dd') === dayStr
    );
    
    const totalHours = dayShifts.reduce((total, shift) => {
      const start = new Date(shift.start_time);
      const end = new Date(shift.end_time);
      return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);

    if (totalHours === 0) return 'available';
    if (totalHours <= 8) return 'scheduled';
    return 'overbooked';
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = addDays(selectedWeek, direction === 'next' ? 7 : -7);
    onWeekChange(newWeek);
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'overbooked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Workforce Overview - {format(selectedWeek, 'MMMM d, yyyy')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigateWeek('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onWeekChange(startOfWeek(new Date()))}
              >
                This Week
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigateWeek('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Workers</p>
                <p className="text-2xl font-bold">{workers.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Utilization</p>
                <p className="text-2xl font-bold">
                  {workers.length > 0 
                    ? Math.round(workers.reduce((sum, w) => sum + getWorkerStats(w.id).utilization, 0) / workers.length)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">
                  {Math.round(workers.reduce((sum, w) => sum + getWorkerStats(w.id).totalHours, 0))}
                </p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overtime</p>
                <p className="text-2xl font-bold text-orange-600">
                  {Math.round(workers.reduce((sum, w) => sum + getWorkerStats(w.id).overtimeHours, 0))}h
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Worker Details */}
      <Card>
        <CardHeader>
          <CardTitle>Worker Details</CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          <div className="space-y-3 md:space-y-4">
            {workers.map(worker => {
              const stats = getWorkerStats(worker.id);
              
              return (
                <Card key={worker.id} className="p-3 md:p-4 border">
                  {/* Mobile-first responsive layout */}
                  <div className="space-y-4">
                    {/* Worker Header - Always horizontal but better spaced */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 md:h-10 md:w-10">
                          <AvatarImage src={worker.avatar_url} />
                          <AvatarFallback>
                            {worker.full_name?.split(' ').map(n => n[0]).join('') || 'W'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium text-base md:text-sm">{worker.full_name}</h4>
                          <p className="text-sm text-muted-foreground">{worker.role}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-9 w-9 md:h-8 md:w-8">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Stats Row - Stack on mobile, row on tablet+ */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                      <Badge variant="outline" className="text-xs md:text-sm justify-center sm:justify-start">
                        {stats.totalHours.toFixed(1)}h this week
                      </Badge>
                      {stats.overtimeHours > 0 && (
                        <Badge variant="destructive" className="text-xs md:text-sm justify-center sm:justify-start">
                          {stats.overtimeHours.toFixed(1)}h overtime
                        </Badge>
                      )}
                    </div>

                    {/* Utilization */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Utilization</span>
                        <span className="text-sm text-muted-foreground">
                          {stats.utilization.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={stats.utilization} className="h-2" />
                    </div>

                    {/* Weekly Schedule - Responsive grid */}
                    <div>
                      <h5 className="text-sm font-medium mb-2">Weekly Schedule</h5>
                      <div className="overflow-x-auto">
                        <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-7 gap-2 min-w-max">
                          {weekDays.slice(0, window.innerWidth < 640 ? 4 : window.innerWidth < 1024 ? 5 : 7).map((day, index) => {
                            const availability = getWorkerAvailability(worker.id, day);
                            
                            return (
                              <div key={index} className="text-center min-w-[60px]">
                                <p className="text-xs text-muted-foreground mb-1">
                                  {format(day, 'EEE')}
                                </p>
                                <Badge 
                                  variant="secondary" 
                                  className={`${getAvailabilityColor(availability)} text-xs w-full justify-center`}
                                >
                                  {availability === 'available' ? 'Free' : 
                                   availability === 'scheduled' ? 'Busy' : 
                                   'Over'}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                        {weekDays.length > 4 && window.innerWidth < 640 && (
                          <p className="text-xs text-muted-foreground mt-2 text-center">
                            Scroll to see more days →
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Quick Stats - Responsive grid */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 border-t">
                      <div className="text-center">
                        <p className="text-lg md:text-xl font-bold">{stats.shiftsCount}</p>
                        <p className="text-xs text-muted-foreground">Shifts</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg md:text-xl font-bold text-green-600">{stats.confirmedShifts}</p>
                        <p className="text-xs text-muted-foreground">Confirmed</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg md:text-xl font-bold text-blue-600">
                          {stats.shiftsCount - stats.confirmedShifts}
                        </p>
                        <p className="text-xs text-muted-foreground">Pending</p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}