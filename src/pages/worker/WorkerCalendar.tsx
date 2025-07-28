import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarView } from '@/components/calendar/CalendarView';
import { TaskDetailsModal } from '@/components/admin/TaskDetailsModal';
import { useWorkerCalendarTasks, CalendarTask } from '@/hooks/useCalendarTasks';
import { useUpdateTask } from '@/hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

export function WorkerCalendar() {
  const [currentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  const { data: tasks = [], isLoading } = useWorkerCalendarTasks(
    format(monthStart, 'yyyy-MM-dd'),
    format(monthEnd, 'yyyy-MM-dd')
  );
  
  const updateTask = useUpdateTask();

  const handleTaskClick = (task: CalendarTask) => {
    setSelectedTask(task);
  };

  const handleCloseTaskModal = () => {
    setSelectedTask(null);
  };

  const getTaskStats = () => {
    const today = new Date();
    const upcoming = tasks.filter(task => {
      if (!task.start_date) return false;
      const startDate = new Date(task.start_date);
      return startDate > today && task.status !== 'done';
    });
    
    const inProgress = tasks.filter(task => task.status === 'in_progress');
    const overdue = tasks.filter(task => {
      if (!task.end_date) return false;
      const endDate = new Date(task.end_date);
      return endDate < today && task.status !== 'done';
    });

    return { upcoming: upcoming.length, inProgress: inProgress.length, overdue: overdue.length };
  };

  const stats = getTaskStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-muted-foreground">Loading your calendar...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Calendar</h1>
        <p className="text-muted-foreground">
          View your scheduled tasks and track progress
        </p>
      </div>

      {/* Task Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">
              Tasks currently active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.upcoming}</div>
            <p className="text-xs text-muted-foreground">
              Tasks starting soon
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">
              Tasks past due date
            </p>
          </CardContent>
        </Card>
      </div>

      <CalendarView
        tasks={tasks}
        onTaskClick={handleTaskClick}
        isAdmin={false}
      />

      {selectedTask && (
        <TaskDetailsModal
          task={{
            id: selectedTask.id,
            title: selectedTask.title,
            description: selectedTask.description || '',
            status: selectedTask.status,
            priority: selectedTask.priority,
            assignee: selectedTask.assignee || '',
            project_id: selectedTask.project_id || '',
            phase_id: selectedTask.phase_id || '',
            created_at: selectedTask.created_at,
            updated_at: selectedTask.updated_at,
            completed_at: null,
          }}
          isOpen={!!selectedTask}
          onClose={handleCloseTaskModal}
        />
      )}
    </div>
  );
}