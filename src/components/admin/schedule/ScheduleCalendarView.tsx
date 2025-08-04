import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DragDropProvider } from '@/components/lists/DragDropProvider';
import { DraggableTaskListItem } from '@/components/lists/DraggableTaskListItem';
import { DroppableListContainer } from '@/components/lists/DroppableListContainer';
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
}

export function ScheduleCalendarView({ 
  selectedDate, 
  onDateChange, 
  shifts, 
  tasks, 
  workers 
}: ScheduleCalendarViewProps) {
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(selectedDate));
  const [showUnassigned, setShowUnassigned] = useState(false);

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

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Calendar className="h-5 w-5" />
                Week of {format(selectedWeek, 'MMMM d, yyyy')}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {format(selectedWeek, 'MMM d')} - {format(addDays(selectedWeek, 6), 'MMM d, yyyy')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigateWeek('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedWeek(startOfWeek(new Date()))}
              >
                This Week
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigateWeek('next')}
              >
                Next
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
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
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
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((day, index) => {
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            
            return (
              <Card key={index} className={cn(
                "transition-all duration-200",
                isToday && "ring-2 ring-primary/50 bg-primary/5",
                isSelected && "ring-2 ring-primary bg-primary/10"
              )}>
                <CardHeader className="p-4 text-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      {format(day, 'EEE')}
                    </p>
                    <p className="text-2xl font-bold">{format(day, 'd')}</p>
                    <p className="text-xs text-muted-foreground">{format(day, 'MMM')}</p>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Schedule Content */}
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((day, index) => {
            const dayShifts = getShiftsForDay(day);
            const dayTasks = getTasksForDay(day);
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');

            return (
              <Card 
                key={index} 
                className={cn(
                  "min-h-[400px] cursor-pointer transition-all duration-200 hover:shadow-md",
                  isToday && "ring-1 ring-primary/30 bg-primary/5",
                  isSelected && "ring-2 ring-primary bg-primary/10"
                )}
                onClick={() => onDateChange(day)}
              >
                <CardContent className="p-4 h-full">
                  <div className="space-y-3 h-full">
                    {/* Shifts */}
                    {dayShifts.map(shift => (
                      <div
                        key={shift.id}
                        className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm line-clamp-1">{shift.task?.title}</span>
                          <Badge 
                            variant={shift.status === 'confirmed' ? 'default' : 'secondary'}
                            className="text-xs shrink-0"
                          >
                            {shift.status}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(shift.start_time), 'HH:mm')} - 
                            {format(new Date(shift.end_time), 'HH:mm')}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {shift.worker?.full_name}
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
                            className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg shadow-sm"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm line-clamp-1">{task.title}</span>
                              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                            </div>
                            {task.assignee_profile && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Users className="h-3 w-3" />
                                {task.assignee_profile.full_name}
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
                        className="w-full justify-center text-muted-foreground hover:text-foreground border border-dashed border-muted-foreground/30 hover:border-muted-foreground/60"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Task
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}