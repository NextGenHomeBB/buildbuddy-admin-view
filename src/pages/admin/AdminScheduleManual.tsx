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
import { useCreateTask } from '@/hooks/useTasks';
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
  const createTaskMutation = useCreateTask();

  const handleTaskCreate = async (taskData: any) => {
    try {
      if (!taskData.project_id) {
        toast({
          title: "Error",
          description: "Please select a project to create the task",
          variant: "destructive"
        });
        return;
      }

      // Calculate end_date from start_date + duration_days
      const endDate = taskData.start_date && taskData.duration_days 
        ? new Date(new Date(taskData.start_date).getTime() + (taskData.duration_days - 1) * 24 * 60 * 60 * 1000)
        : undefined;

      const createTaskData = {
        title: taskData.title,
        description: taskData.description || undefined,
        status: 'todo' as const,
        priority: taskData.priority,
        phase_id: taskData.phase_id || undefined,
        assignee: taskData.assignee || undefined,
        start_date: taskData.start_date,
        duration_days: taskData.duration_days,
        end_date: endDate?.toISOString().split('T')[0],
        is_scheduled: true
      };

      await createTaskMutation.mutateAsync({
        projectId: taskData.project_id,
        data: createTaskData
      });

      toast({
        title: "Success", 
        description: "Task created successfully"
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Manual Scheduling</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Plan and manage worker schedules with intelligent assistance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-auto">
            <Settings className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Settings</span>
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Total Shifts</p>
                <p className="text-xl sm:text-2xl font-bold">{totalShifts}</p>
              </div>
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground shrink-0" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Confirmed</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{confirmedShifts}</p>
              </div>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground shrink-0" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Workers</p>
                <p className="text-xl sm:text-2xl font-bold">{totalWorkers}</p>
              </div>
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground shrink-0" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Active Tasks</p>
                <p className="text-xl sm:text-2xl font-bold">{activeTasks}</p>
              </div>
              <MapPin className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Interface */}
      <Tabs value={activeView} onValueChange={setActiveView as any} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calendar" className="flex items-center gap-1 sm:gap-2 min-h-[44px] sm:min-h-auto">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendar</span>
            <span className="sm:hidden">Cal</span>
          </TabsTrigger>
          <TabsTrigger value="board" className="flex items-center gap-1 sm:gap-2 min-h-[44px] sm:min-h-auto">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Schedule</span>
            <span className="sm:hidden">Sch</span>
          </TabsTrigger>
          <TabsTrigger value="workforce" className="flex items-center gap-1 sm:gap-2 min-h-[44px] sm:min-h-auto">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Workforce</span>
            <span className="sm:hidden">Work</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1 sm:gap-2 min-h-[44px] sm:min-h-auto">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
            <span className="sm:hidden">Data</span>
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