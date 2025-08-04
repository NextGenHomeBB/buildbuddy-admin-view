import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Clock, 
  AlertTriangle,
  Plus,
  MoreVertical 
} from 'lucide-react';
import { format, addDays, startOfWeek, eachDayOfInterval } from 'date-fns';
import { DragDropProvider } from '@/components/lists/DragDropProvider';
import { DraggableTaskListItem } from '@/components/lists/DraggableTaskListItem';
import { DroppableListContainer } from '@/components/lists/DroppableListContainer';
import { AddTaskDialog } from './AddTaskDialog';
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

interface ScheduleBoardProps {
  selectedWeek: Date;
  onWeekChange: (week: Date) => void;
  shifts: Shift[];
  tasks: Task[];
  workers: Worker[];
  onTaskCreate?: (task: {
    title: string;
    description: string;
    priority: string;
    assignee?: string;
    start_date: string;
    duration_days: number;
  }) => void;
}

export function ScheduleBoard({ 
  selectedWeek, 
  onWeekChange, 
  shifts, 
  tasks, 
  workers,
  onTaskCreate
}: ScheduleBoardProps) {
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');

  const weekDays = eachDayOfInterval({
    start: startOfWeek(selectedWeek),
    end: addDays(startOfWeek(selectedWeek), 6)
  });

  // Calculate worker utilization
  const getWorkerUtilization = (workerId: string, day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const workerShifts = shifts.filter(shift => 
      shift.worker_id === workerId &&
      format(new Date(shift.start_time), 'yyyy-MM-dd') === dayStr
    );
    
    const totalHours = workerShifts.reduce((total, shift) => {
      const start = new Date(shift.start_time);
      const end = new Date(shift.end_time);
      return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);
    
    return Math.min(totalHours / 8 * 100, 100); // Assuming 8-hour standard day
  };

  // Get shifts for worker on specific day
  const getWorkerShifts = (workerId: string, day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return shifts.filter(shift => 
      shift.worker_id === workerId &&
      format(new Date(shift.start_time), 'yyyy-MM-dd') === dayStr
    );
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = addDays(selectedWeek, direction === 'next' ? 7 : -7);
    onWeekChange(newWeek);
  };

  const handleTaskMove = (taskId: string, newListId: string, newPosition: number) => {
    console.log('Moving task', taskId, 'to list', newListId, 'at position', newPosition);
  };

  const handleAddTask = (workerId: string, date: Date) => {
    setSelectedWorkerId(workerId);
    setSelectedDate(date);
    setAddTaskDialogOpen(true);
  };

  const handleTaskCreateWithAssignee = (taskData: any) => {
    if (onTaskCreate) {
      onTaskCreate({
        ...taskData,
        assignee: selectedWorkerId
      });
    }
  };
  const handleTaskReorder = (taskId: string, newPosition: number) => {
    console.log('Reordering task', taskId, 'to position', newPosition);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Schedule Board - {format(selectedWeek, 'MMMM d, yyyy')}
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

      {/* Board Content */}
      <div className="border rounded-lg overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-8 border-b bg-muted/30">
          <div className="p-4 border-r">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="font-medium">Workers</span>
            </div>
          </div>
          {weekDays.map((day, index) => (
            <div key={index} className="p-4 border-r last:border-r-0 text-center">
              <div className="space-y-1">
                <p className="text-sm font-medium">{format(day, 'EEE')}</p>
                <p className="text-lg font-bold">{format(day, 'd')}</p>
                <p className="text-xs text-muted-foreground">{format(day, 'MMM')}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Worker Rows */}
        <DragDropProvider
          tasks={tasks}
          onTaskMove={handleTaskMove}
          onTaskReorder={handleTaskReorder}
        >
          {workers.map((worker, workerIndex) => (
            <div 
              key={worker.id} 
              className={cn(
                "grid grid-cols-8 border-b last:border-b-0 hover:bg-accent/20 transition-colors",
                selectedWorker === worker.id && "bg-accent/30"
              )}
            >
              {/* Worker Info */}
              <div className="p-4 border-r bg-background">
                <div 
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setSelectedWorker(selectedWorker === worker.id ? null : worker.id)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={worker.avatar_url} />
                    <AvatarFallback>
                      {worker.full_name?.split(' ').map(n => n[0]).join('') || 'W'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{worker.full_name}</p>
                    <p className="text-sm text-muted-foreground">{worker.role}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Day Cells */}
              {weekDays.map((day, dayIndex) => {
                const utilization = getWorkerUtilization(worker.id, day);
                const workerShifts = getWorkerShifts(worker.id, day);
                const dayTasks = tasks.filter(task => 
                  task.assignee === worker.id &&
                  task.start_date &&
                  format(new Date(task.start_date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                );

                return (
                  <div 
                    key={dayIndex} 
                    className="p-2 border-r last:border-r-0 min-h-[120px] relative"
                  >
                    {/* Utilization Bar */}
                    <div className="mb-2">
                      <Progress 
                        value={utilization} 
                        className="h-2"
                        // className={cn(
                        //   "h-2",
                        //   utilization > 100 && "bg-red-100",
                        //   utilization > 80 && utilization <= 100 && "bg-yellow-100",
                        //   utilization <= 80 && "bg-green-100"
                        // )}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {utilization.toFixed(0)}% utilized
                      </p>
                    </div>

                    {/* Shifts */}
                    <DroppableListContainer 
                      id={`worker-${worker.id}-day-${format(day, 'yyyy-MM-dd')}`}
                      className="space-y-1"
                      emptyMessage=""
                    >
                      {workerShifts.map(shift => (
                        <div
                          key={shift.id}
                          className={cn(
                            "p-2 rounded text-xs space-y-1",
                            shift.status === 'confirmed' ? "bg-green-100 dark:bg-green-900/30" :
                            shift.status === 'proposed' ? "bg-blue-100 dark:bg-blue-900/30" :
                            "bg-gray-100 dark:bg-gray-900/30"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium truncate">{shift.task?.title}</span>
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
                        </div>
                      ))}

                      {dayTasks.map(task => (
                        <DraggableTaskListItem
                          key={task.id}
                          task={task}
                        />
                      ))}
                    </DroppableListContainer>

                    {/* Add Task Button */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full mt-2 justify-start text-muted-foreground"
                      onClick={() => handleAddTask(worker.id, day)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>

                    {/* Overallocation Warning */}
                    {utilization > 100 && (
                      <div className="absolute top-1 right-1">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </DragDropProvider>
      </div>

      {/* Add Task Dialog */}
      <AddTaskDialog
        open={addTaskDialogOpen}
        onOpenChange={setAddTaskDialogOpen}
        selectedDate={selectedDate}
        workers={workers}
        onTaskCreate={handleTaskCreateWithAssignee}
      />
    </div>
  );
}