import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
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
  CheckCircle2 
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
  const [showUnassigned, setShowUnassigned] = useState(true);

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
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Week of {format(selectedWeek, 'MMMM d, yyyy')}
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
                onClick={() => setSelectedWeek(startOfWeek(new Date()))}
              >
                Today
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

      <div className="grid grid-cols-1 lg:grid-cols-8 gap-6">
        {/* Unassigned Tasks Sidebar */}
        {showUnassigned && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                <span>Unassigned Tasks</span>
                <Badge variant="secondary">{unassignedTasks.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DragDropProvider
                tasks={unassignedTasks}
                onTaskMove={handleTaskMove}
                onTaskReorder={handleTaskReorder}
              >
                <DroppableListContainer 
                  id="unassigned"
                  className="space-y-2 min-h-[200px]"
                  emptyMessage="No unassigned tasks"
                >
                  {unassignedTasks.map(task => (
                    <DraggableTaskListItem
                      key={task.id}
                      task={task}
                    />
                  ))}
                </DroppableListContainer>
              </DragDropProvider>
            </CardContent>
          </Card>
        )}

        {/* Calendar Grid */}
        <div className={cn("space-y-4", showUnassigned ? "lg:col-span-6" : "lg:col-span-8")}>
          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, index) => (
              <Card key={index} className={cn(
                "transition-colors",
                format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') && "ring-2 ring-primary"
              )}>
                <CardHeader className="p-3">
                  <div className="text-center">
                    <p className="text-sm font-medium">{format(day, 'EEE')}</p>
                    <p className="text-lg font-bold">{format(day, 'd')}</p>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Schedule Content */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, index) => {
              const dayShifts = getShiftsForDay(day);
              const dayTasks = getTasksForDay(day);
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');

              return (
                <Card 
                  key={index} 
                  className={cn(
                    "min-h-[300px] cursor-pointer transition-colors",
                    isToday && "bg-accent/20",
                    isSelected && "ring-2 ring-primary"
                  )}
                  onClick={() => onDateChange(day)}
                >
                  <CardContent className="p-3 space-y-2">
                    {/* Shifts */}
                    {dayShifts.map(shift => (
                      <div
                        key={shift.id}
                        className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{shift.task?.title}</span>
                          <Badge 
                            variant={shift.status === 'confirmed' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {shift.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(shift.start_time), 'HH:mm')} - 
                          {format(new Date(shift.end_time), 'HH:mm')}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {shift.worker?.full_name}
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
                        className="space-y-2"
                        emptyMessage=""
                      >
                        {dayTasks.map(task => (
                          <div
                            key={task.id}
                            className="p-2 bg-green-100 dark:bg-green-900/30 rounded text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{task.title}</span>
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                            </div>
                            {task.assignee_profile && (
                              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                                <Users className="h-3 w-3" />
                                {task.assignee_profile.full_name}
                              </div>
                            )}
                          </div>
                        ))}
                      </DroppableListContainer>
                    </DragDropProvider>

                    {/* Add Task Button */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start text-muted-foreground"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add task
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}