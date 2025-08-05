import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Clock,
  AlertTriangle 
} from 'lucide-react';
import { format } from 'date-fns';
import { CompactTaskCard } from './CompactTaskCard';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee?: string;
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
}

interface Worker {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string;
}

interface MobileWorkerScheduleProps {
  worker: Worker;
  weekDays: Date[];
  shifts: Shift[];
  tasks: Task[];
  getWorkerUtilization: (workerId: string, day: Date) => number;
  getWorkerShifts: (workerId: string, day: Date) => Shift[];
  onAddTask: (workerId: string, date: Date) => void;
}

export function MobileWorkerSchedule({
  worker,
  weekDays,
  shifts,
  tasks,
  getWorkerUtilization,
  getWorkerShifts,
  onAddTask
}: MobileWorkerScheduleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalUtilization = weekDays.reduce((total, day) => 
    total + getWorkerUtilization(worker.id, day), 0
  ) / weekDays.length;

  const hasOverallocation = weekDays.some(day => getWorkerUtilization(worker.id, day) > 100);

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        {/* Worker Header */}
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={worker.avatar_url} />
              <AvatarFallback>
                {worker.full_name?.split(' ').map(n => n[0]).join('') || 'W'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{worker.full_name}</h3>
                {hasOverallocation && (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">{worker.role}</p>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={totalUtilization} className="h-2 w-20" />
                <span className="text-xs text-muted-foreground">
                  {totalUtilization.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
          
          <Button variant="ghost" size="sm">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Expanded Schedule */}
        {isExpanded && (
          <div className="mt-4 space-y-3">
            {weekDays.map((day, index) => {
              const utilization = getWorkerUtilization(worker.id, day);
              const workerShifts = getWorkerShifts(worker.id, day);
              const dayTasks = tasks.filter(task => 
                task.assignee === worker.id &&
                task.start_date &&
                format(new Date(task.start_date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
              );

              return (
                <div 
                  key={index}
                  className={cn(
                    "p-3 rounded-lg border",
                    utilization > 100 ? "bg-red-50 dark:bg-red-900/20 border-red-200" :
                    utilization > 80 ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200" :
                    "bg-card"
                  )}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{format(day, 'EEEE')}</h4>
                      <p className="text-sm text-muted-foreground">{format(day, 'MMM d')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{utilization.toFixed(0)}%</p>
                      <Progress value={utilization} className="h-2 w-16" />
                    </div>
                  </div>

                  {/* Shifts */}
                  <div className="space-y-2 mb-3">
                    {workerShifts.map(shift => (
                      <div
                        key={shift.id}
                        className={cn(
                          "p-2 rounded text-sm",
                          shift.status === 'confirmed' ? "bg-green-100 dark:bg-green-900/30" :
                          shift.status === 'proposed' ? "bg-blue-100 dark:bg-blue-900/30" :
                          "bg-muted"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{shift.task?.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {shift.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs">
                            {format(new Date(shift.start_time), 'HH:mm')} - 
                            {format(new Date(shift.end_time), 'HH:mm')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tasks */}
                  <div className="space-y-2 mb-3">
                    {dayTasks.map(task => (
                      <CompactTaskCard key={task.id} task={task} />
                    ))}
                  </div>

                  {/* Add Task Button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => onAddTask(worker.id, day)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}