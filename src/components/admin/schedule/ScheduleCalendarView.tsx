import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DragDropProvider } from '@/components/lists/DragDropProvider';
import { DraggableTaskListItem } from '@/components/lists/DraggableTaskListItem';
import { DroppableListContainer } from '@/components/lists/DroppableListContainer';
import { AddTaskDialog } from './AddTaskDialog';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Users, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Calendar
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee?: string;
  project?: { name: string };
  assignee_profile?: { full_name: string; avatar_url?: string };
  start_date?: string;
  end_date?: string;
  duration_days?: number;
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

interface ScheduleCalendarViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  shifts: Shift[];
  tasks: Task[];
  workers: Worker[];
  onTaskCreate?: (task: any) => void;
}

export function ScheduleCalendarView({ 
  selectedDate, 
  onDateChange, 
  shifts, 
  tasks, 
  workers,
  onTaskCreate 
}: ScheduleCalendarViewProps) {
  const { toast } = useToast();
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(selectedDate));
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);
  const [selectedDayForTask, setSelectedDayForTask] = useState<Date>(new Date());

  const weekDays = eachDayOfInterval({
    start: startOfWeek(selectedWeek),
    end: endOfWeek(selectedWeek)
  });

  // Filter unassigned tasks
  const unassignedTasks = tasks.filter(task => 
    !task.assignee && 
    task.status !== 'done' &&
    (!task.start_date || new Date(task.start_date) >= startOfWeek(selectedWeek))
  );

  // Get shifts for a specific day
  const getShiftsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return shifts.filter(shift => 
      format(new Date(shift.start_time), 'yyyy-MM-dd') === dayStr
    );
  };

  // Get tasks scheduled for a specific day
  const getTasksForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return tasks.filter(task => 
      task.assignee &&
      task.start_date &&
      format(new Date(task.start_date), 'yyyy-MM-dd') === dayStr
    );
  };

  // Calculate worker utilization for a day
  const getWorkerUtilization = (workerId: string, day: Date) => {
    const dayShifts = getShiftsForDay(day).filter(s => s.worker_id === workerId);
    const totalHours = dayShifts.reduce((total, shift) => {
      const start = new Date(shift.start_time);
      const end = new Date(shift.end_time);
      return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);
    return totalHours;
  };

  const handleTaskMove = (taskId: string, targetDate: string) => {
    // Implementation for moving tasks between dates
    console.log('Moving task', taskId, 'to', targetDate);
  };

  const handleTaskReorder = (taskId: string, newPosition: number) => {
    // Implementation for reordering tasks within the same day
    console.log('Reordering task', taskId, 'to position', newPosition);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = addDays(selectedWeek, direction === 'next' ? 7 : -7);
    setSelectedWeek(newWeek);
  };

  const handleAddTask = (day: Date) => {
    setSelectedDayForTask(day);
    setAddTaskDialogOpen(true);
  };

  const handleTaskCreate = (taskData: any) => {
    if (onTaskCreate) {
      onTaskCreate({
        ...taskData,
        id: `temp-${Date.now()}`, // Temporary ID until saved to database
        status: 'todo',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } else {
      toast({
        title: "Info",
        description: "Task creation handler not implemented yet",
        variant: "default"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Week of {format(selectedWeek, 'MMMM d, yyyy')}</span>
                <span className="sm:hidden">{format(selectedWeek, 'MMM d, yyyy')}</span>
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {format(selectedWeek, 'MMM d')} - {format(addDays(selectedWeek, 6), 'MMM d, yyyy')}
              </p>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
              <Button 
                variant="outline" 
                size="sm"
                className="min-h-[44px] sm:min-h-auto shrink-0"
                onClick={() => navigateWeek('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="min-h-[44px] sm:min-h-auto shrink-0"
                onClick={() => setSelectedWeek(startOfWeek(new Date()))}
              >
                <span className="hidden sm:inline">This Week</span>
                <span className="sm:hidden">Today</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="min-h-[44px] sm:min-h-auto shrink-0"
                onClick={() => navigateWeek('next')}
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Unassigned Tasks Collapsible Panel */}
      <Collapsible open={showUnassigned} onOpenChange={setShowUnassigned}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/5 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span>Unassigned Tasks</span>
                  <Badge variant="secondary" className="ml-2">{unassignedTasks.length}</Badge>
                </CardTitle>
                <ChevronDown className={cn("h-4 w-4 transition-transform", showUnassigned && "rotate-180")} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <DragDropProvider
                tasks={unassignedTasks}
                onTaskMove={handleTaskMove}
                onTaskReorder={handleTaskReorder}
              >
                <DroppableListContainer 
                  id="unassigned"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                  emptyMessage="No unassigned tasks"
                >
                  {unassignedTasks.map(task => (
                    <div
                      key={task.id}
                      className="p-3 border border-dashed border-muted-foreground/30 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors cursor-move"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          {task.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {task.project?.name}
                        </span>
                      </div>
                      <h4 className="font-medium text-sm mb-1 line-clamp-2">{task.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {task.duration_days ? `${task.duration_days} days` : 'No duration set'}
                      </div>
                    </div>
                  ))}
                </DroppableListContainer>
              </DragDropProvider>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Enhanced Calendar Grid */}
      <div className="space-y-4">
        {/* Week Days Header */}
        <div className="hidden md:grid grid-cols-7 gap-3">
          {weekDays.map((day, index) => {
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            
            return (
              <Card key={index} className={cn(
                "transition-all duration-200",
                isToday && "ring-2 ring-primary/50 bg-primary/5",
                isSelected && "ring-2 ring-primary bg-primary/10"
              )}>
                <CardHeader className="p-3 lg:p-4 text-center">
                  <div className="space-y-1">
                    <p className="text-xs lg:text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      {format(day, 'EEE')}
                    </p>
                    <p className="text-xl lg:text-2xl font-bold">{format(day, 'd')}</p>
                    <p className="text-xs text-muted-foreground">{format(day, 'MMM')}</p>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Schedule Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {weekDays.map((day, index) => {
            const dayShifts = getShiftsForDay(day);
            const dayTasks = getTasksForDay(day);
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');

            return (
              <Card 
                key={index} 
                className={cn(
                  "min-h-[300px] sm:min-h-[350px] md:min-h-[400px] cursor-pointer transition-all duration-200 hover:shadow-md",
                  isToday && "ring-1 ring-primary/30 bg-primary/5",
                  isSelected && "ring-2 ring-primary bg-primary/10"
                )}
                onClick={() => onDateChange(day)}
              >
                <CardContent className="p-3 sm:p-4 h-full">
                  <div className="space-y-2 sm:space-y-3 h-full">
                    {/* Day Header - Mobile Only */}
                    <div className="md:hidden mb-3 pb-2 border-b border-border">
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {format(day, 'EEE')}
                          </p>
                          <p className="text-lg font-bold">{format(day, 'd')}</p>
                          <p className="text-xs text-muted-foreground">{format(day, 'MMM')}</p>
                        </div>
                        {(isToday || isSelected) && (
                          <div className="text-xs">
                            {isToday && <span className="text-primary font-medium">Today</span>}
                            {isSelected && !isToday && <span className="text-primary font-medium">Selected</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Shifts */}
                    {dayShifts.map(shift => (
                      <div
                        key={shift.id}
                        className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg space-y-1 sm:space-y-2 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-xs sm:text-sm line-clamp-1">{shift.task?.title}</span>
                          <Badge 
                            variant={shift.status === 'confirmed' ? 'default' : 'secondary'}
                            className="text-xs shrink-0"
                          >
                            {shift.status}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span className="truncate">
                              {format(new Date(shift.start_time), 'HH:mm')} - 
                              {format(new Date(shift.end_time), 'HH:mm')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span className="truncate">{shift.worker?.full_name}</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Tasks */}
                    <DragDropProvider
                      tasks={dayTasks}
                      onTaskMove={handleTaskMove}
                      onTaskReorder={handleTaskReorder}
                    >
                      <DroppableListContainer 
                        id={`day-${format(day, 'yyyy-MM-dd')}`}
                        className="space-y-2 flex-1"
                        emptyMessage=""
                      >
                        {dayTasks.map(task => (
                          <div
                            key={task.id}
                            className="p-2 sm:p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg shadow-sm"
                          >
                            <div className="flex items-center justify-between mb-1 sm:mb-2">
                              <span className="font-medium text-xs sm:text-sm line-clamp-1">{task.title}</span>
                              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                            </div>
                            {task.assignee_profile && (
                              <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                                <Users className="h-3 w-3" />
                                <span className="truncate">{task.assignee_profile.full_name}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </DroppableListContainer>
                    </DragDropProvider>

                    {/* Add Task Button */}
                    <div className="mt-auto">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-center text-muted-foreground hover:text-foreground border border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 min-h-[44px] sm:min-h-auto"
                        onClick={() => handleAddTask(day)}
                      >
                        <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                        <span className="text-xs sm:text-sm">Add Task</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Add Task Dialog */}
      <AddTaskDialog
        open={addTaskDialogOpen}
        onOpenChange={setAddTaskDialogOpen}
        selectedDate={selectedDayForTask}
        workers={workers}
        onTaskCreate={handleTaskCreate}
      />
    </div>
  );
}