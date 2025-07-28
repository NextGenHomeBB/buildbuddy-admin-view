import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskCalendarItem } from './TaskCalendarItem';
import { CalendarTask } from '@/hooks/useCalendarTasks';
import { cn } from '@/lib/utils';

interface CalendarViewProps {
  tasks: CalendarTask[];
  onTaskClick?: (task: CalendarTask) => void;
  onDateClick?: (date: Date) => void;
  onTaskMove?: (taskId: string, newDate: Date) => void;
  isAdmin?: boolean;
}

export function CalendarView({ 
  tasks, 
  onTaskClick, 
  onDateClick, 
  onTaskMove, 
  isAdmin = false 
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      if (!task.start_date) return false;
      const taskStart = new Date(task.start_date);
      const taskEnd = task.end_date ? new Date(task.end_date) : taskStart;
      return date >= taskStart && date <= taskEnd;
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId && onTaskMove) {
      onTaskMove(taskId, date);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
          <CardTitle className="text-xl sm:text-2xl font-bold text-center sm:text-left">
            {format(currentDate, 'MMMM yyyy')}
          </CardTitle>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:ml-1">Previous</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-6">
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
            <div key={day} className="p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-muted-foreground">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.slice(0, 1)}</span>
            </div>
          ))}
          
          {/* Calendar days */}
          {calendarDays.map(day => {
            const dayTasks = getTasksForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[80px] sm:min-h-[120px] p-0.5 sm:p-1 border border-border cursor-pointer transition-colors",
                  !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                  isToday && "bg-primary/10 border-primary",
                  "hover:bg-accent/50"
                )}
                onClick={() => onDateClick?.(day)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, day)}
              >
                <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                  <span className={cn(
                    "text-xs sm:text-sm font-medium",
                    isToday && "text-primary font-bold"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {isAdmin && dayTasks.length === 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 sm:h-5 sm:w-5 p-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDateClick?.(day);
                      }}
                    >
                      <Plus className="h-2 w-2 sm:h-3 sm:w-3" />
                    </Button>
                  )}
                </div>
                
                <div className="space-y-0.5 sm:space-y-1">
                  {dayTasks.slice(0, isAdmin ? 3 : 2).map(task => (
                    <TaskCalendarItem
                      key={task.id}
                      task={task}
                      onClick={() => onTaskClick?.(task)}
                      isDraggable={isAdmin}
                    />
                  ))}
                  {dayTasks.length > (isAdmin ? 3 : 2) && (
                    <div className="text-xs text-muted-foreground px-0.5 sm:px-1">
                      +{dayTasks.length - (isAdmin ? 3 : 2)} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}