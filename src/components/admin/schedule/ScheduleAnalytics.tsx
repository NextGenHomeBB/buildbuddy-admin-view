import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  AlertTriangle,
  Target,
  Download
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee?: string;
  project?: { name: string };
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

interface Worker {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string;
}

interface ScheduleAnalyticsProps {
  shifts: Shift[];
  workers: Worker[];
  tasks: Task[];
}

export function ScheduleAnalytics({ shifts, workers, tasks }: ScheduleAnalyticsProps) {
  const currentWeek = startOfWeek(new Date());
  const previousWeek = subWeeks(currentWeek, 1);

  // Calculate metrics for current and previous weeks
  const getWeekShifts = (weekStart: Date) => {
    const weekEnd = endOfWeek(weekStart);
    return shifts.filter(shift => {
      const shiftDate = new Date(shift.start_time);
      return shiftDate >= weekStart && shiftDate <= weekEnd;
    });
  };

  const currentWeekShifts = getWeekShifts(currentWeek);
  const previousWeekShifts = getWeekShifts(previousWeek);

  // Key metrics
  const metrics = {
    totalShifts: {
      current: currentWeekShifts.length,
      previous: previousWeekShifts.length,
      change: currentWeekShifts.length - previousWeekShifts.length
    },
    confirmedShifts: {
      current: currentWeekShifts.filter(s => s.status === 'confirmed').length,
      previous: previousWeekShifts.filter(s => s.status === 'confirmed').length,
      get change() { return this.current - this.previous; }
    },
    totalHours: {
      current: currentWeekShifts.reduce((total, shift) => {
        const start = new Date(shift.start_time);
        const end = new Date(shift.end_time);
        return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0),
      previous: previousWeekShifts.reduce((total, shift) => {
        const start = new Date(shift.start_time);
        const end = new Date(shift.end_time);
        return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0),
      get change() { return this.current - this.previous; }
    },
    utilization: {
      current: workers.length > 0 ? (currentWeekShifts.length / (workers.length * 5)) * 100 : 0, // 5 work days
      previous: workers.length > 0 ? (previousWeekShifts.length / (workers.length * 5)) * 100 : 0,
      get change() { return this.current - this.previous; }
    }
  };

  // Worker performance
  const workerPerformance = workers.map(worker => {
    const workerShifts = currentWeekShifts.filter(s => s.worker_id === worker.id);
    const totalHours = workerShifts.reduce((total, shift) => {
      const start = new Date(shift.start_time);
      const end = new Date(shift.end_time);
      return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);
    
    return {
      ...worker,
      shiftsCount: workerShifts.length,
      totalHours,
      utilization: Math.min(totalHours / 40 * 100, 100), // 40-hour standard week
      confirmedShifts: workerShifts.filter(s => s.status === 'confirmed').length
    };
  }).sort((a, b) => b.totalHours - a.totalHours);

  // Project analysis
  const projectStats = tasks.reduce((acc, task) => {
    const projectName = task.project?.name || 'Unassigned';
    if (!acc[projectName]) {
      acc[projectName] = {
        totalTasks: 0,
        completedTasks: 0,
        assignedTasks: 0,
        shifts: 0
      };
    }
    
    acc[projectName].totalTasks++;
    if (task.status === 'done') acc[projectName].completedTasks++;
    if (task.assignee) acc[projectName].assignedTasks++;
    
    // Count shifts for this project's tasks
    const taskShifts = shifts.filter(s => s.task_id === task.id);
    acc[projectName].shifts += taskShifts.length;
    
    return acc;
  }, {} as Record<string, any>);

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Target className="h-4 w-4 text-gray-600" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Schedule Analytics
            </CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Shifts</p>
                <p className="text-2xl font-bold">{metrics.totalShifts.current}</p>
                <div className={`flex items-center gap-1 text-sm ${getChangeColor(metrics.totalShifts.change)}`}>
                  {getChangeIcon(metrics.totalShifts.change)}
                  <span>{Math.abs(metrics.totalShifts.change)} vs last week</span>
                </div>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold text-green-600">{metrics.confirmedShifts.current}</p>
                <div className={`flex items-center gap-1 text-sm ${getChangeColor(metrics.confirmedShifts.change)}`}>
                  {getChangeIcon(metrics.confirmedShifts.change)}
                  <span>{Math.abs(metrics.confirmedShifts.change)} vs last week</span>
                </div>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{Math.round(metrics.totalHours.current)}</p>
                <div className={`flex items-center gap-1 text-sm ${getChangeColor(metrics.totalHours.change)}`}>
                  {getChangeIcon(metrics.totalHours.change)}
                  <span>{Math.abs(Math.round(metrics.totalHours.change))}h vs last week</span>
                </div>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Utilization</p>
                <p className="text-2xl font-bold">{Math.round(metrics.utilization.current)}%</p>
                <div className={`flex items-center gap-1 text-sm ${getChangeColor(metrics.utilization.change)}`}>
                  {getChangeIcon(metrics.utilization.change)}
                  <span>{Math.abs(Math.round(metrics.utilization.change))}% vs last week</span>
                </div>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Performers This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workerPerformance.slice(0, 5).map((worker, index) => (
                <div key={worker.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{worker.full_name}</p>
                      <p className="text-sm text-muted-foreground">{worker.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{worker.totalHours.toFixed(1)}h</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {worker.shiftsCount} shifts
                      </Badge>
                      <Badge 
                        variant={worker.utilization > 100 ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {worker.utilization.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Project Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Project Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(projectStats)
                .sort(([,a], [,b]) => b.shifts - a.shifts)
                .slice(0, 5)
                .map(([projectName, stats]) => (
                <div key={projectName} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{projectName}</p>
                    <Badge variant="outline">{stats.shifts} shifts</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">{stats.totalTasks}</span> total tasks
                    </div>
                    <div>
                      <span className="font-medium">{stats.completedTasks}</span> completed
                    </div>
                    <div>
                      <span className="font-medium">{stats.assignedTasks}</span> assigned
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Schedule Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Schedule Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="font-medium">Overallocated Workers</span>
                </div>
                <Badge variant="destructive">
                  {workerPerformance.filter(w => w.utilization > 100).length}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium">Pending Confirmations</span>
                </div>
                <Badge variant="outline">
                  {shifts.filter(s => s.status === 'proposed').length}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Underutilized Workers</span>
                </div>
                <Badge variant="secondary">
                  {workerPerformance.filter(w => w.utilization < 50).length}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Optimal Utilization</span>
                </div>
                <Badge variant="outline">
                  {workerPerformance.filter(w => w.utilization >= 50 && w.utilization <= 100).length}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Efficiency */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Schedule Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Confirmation Rate</span>
                  <span className="text-sm font-bold">
                    {shifts.length > 0 
                      ? Math.round((shifts.filter(s => s.status === 'confirmed').length / shifts.length) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full"
                    style={{ 
                      width: `${shifts.length > 0 
                        ? (shifts.filter(s => s.status === 'confirmed').length / shifts.length) * 100
                        : 0}%` 
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Task Assignment Rate</span>
                  <span className="text-sm font-bold">
                    {tasks.length > 0 
                      ? Math.round((tasks.filter(t => t.assignee).length / tasks.length) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ 
                      width: `${tasks.length > 0 
                        ? (tasks.filter(t => t.assignee).length / tasks.length) * 100
                        : 0}%` 
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Average Utilization</span>
                  <span className="text-sm font-bold">
                    {Math.round(metrics.utilization.current)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${Math.min(metrics.utilization.current, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}