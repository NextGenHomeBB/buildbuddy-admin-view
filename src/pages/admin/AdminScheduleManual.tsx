import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Users, BarChart3, Settings, Clock, MapPin } from 'lucide-react';
import { ScheduleCalendarView } from '@/components/admin/schedule/ScheduleCalendarView';
import { ScheduleBoard } from '@/components/admin/schedule/ScheduleBoard';
import { WorkforceOverview } from '@/components/admin/schedule/WorkforceOverview';
import { ScheduleAnalytics } from '@/components/admin/schedule/ScheduleAnalytics';
import { useShifts } from '@/hooks/useShiftOptimization';
import { useOptimizedTasks } from '@/hooks/useOptimizedTasks';
import { useWorkers } from '@/hooks/useWorkers';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, startOfWeek } from 'date-fns';

export default function AdminScheduleManual() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeView, setActiveView] = useState<'calendar' | 'board' | 'workforce' | 'analytics'>('calendar');
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date()));

  const weekStart = format(selectedWeek, 'yyyy-MM-dd');
  const weekEnd = format(addDays(selectedWeek, 6), 'yyyy-MM-dd');

  const { data: shifts } = useShifts();
  const { data: tasks } = useOptimizedTasks();
  const { data: workers } = useWorkers();

  const handleTaskCreate = async (taskData: any) => {
    try {
      // For now, just show success message
      // In a real implementation, this would call the createTask mutation
      toast({
        title: "Success", 
        description: "Task created successfully (demo mode)"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive"
      });
    }
  };

  const totalShifts = shifts?.length || 0;
  const confirmedShifts = shifts?.filter(s => s.status === 'confirmed').length || 0;
  const totalWorkers = workers?.length || 0;
  const activeTasks = tasks?.filter(t => t.status !== 'done').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manual Scheduling</h1>
          <p className="text-muted-foreground">
            Plan and manage worker schedules with intelligent assistance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Shifts</p>
                <p className="text-2xl font-bold">{totalShifts}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold text-green-600">{confirmedShifts}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Workers</p>
                <p className="text-2xl font-bold">{totalWorkers}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Tasks</p>
                <p className="text-2xl font-bold">{activeTasks}</p>
              </div>
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Interface */}
      <Tabs value={activeView} onValueChange={setActiveView as any} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar View
          </TabsTrigger>
          <TabsTrigger value="board" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Schedule Board
          </TabsTrigger>
          <TabsTrigger value="workforce" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Workforce
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <ScheduleCalendarView 
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            shifts={shifts || []}
            tasks={tasks || []}
            workers={workers || []}
            onTaskCreate={handleTaskCreate}
          />
        </TabsContent>

        <TabsContent value="board" className="space-y-4">
          <ScheduleBoard 
            selectedWeek={selectedWeek}
            onWeekChange={setSelectedWeek}
            shifts={shifts || []}
            tasks={tasks || []}
            workers={workers || []}
            onTaskCreate={handleTaskCreate}
          />
        </TabsContent>

        <TabsContent value="workforce" className="space-y-4">
          <WorkforceOverview 
            workers={workers || []}
            shifts={shifts || []}
            selectedWeek={selectedWeek}
            onWeekChange={setSelectedWeek}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <ScheduleAnalytics 
            shifts={shifts || []}
            workers={workers || []}
            tasks={tasks || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}