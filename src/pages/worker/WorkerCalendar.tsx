import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarView } from '@/components/calendar/CalendarView';
import { TaskDetailsModal } from '@/components/admin/TaskDetailsModal';
import { useWorkerCalendarTasks, CalendarTask } from '@/hooks/useCalendarTasks';
import { useUpdateTask } from '@/hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { useQueryClient } from '@tanstack/react-query';
import { NetworkStatus } from '@/components/ui/network-status';

export function WorkerCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const queryClient = useQueryClient();
  const { lightHaptic } = useHapticFeedback();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  const { data: tasks = [], isLoading, refetch } = useWorkerCalendarTasks(
    format(monthStart, 'yyyy-MM-dd'),
    format(monthEnd, 'yyyy-MM-dd')
  );
  
  const updateTask = useUpdateTask();

  const handleRefresh = async () => {
    lightHaptic();
    await refetch();
    // Invalidate related queries for fresh data
    queryClient.invalidateQueries({ queryKey: ['worker-tasks'] });
  };

  const handleTaskClick = (task: CalendarTask) => {
    lightHaptic();
    setSelectedTask(task);
  };

  const handleCloseTaskModal = () => {
    setSelectedTask(null);
  };

  const handleQuickAction = () => {
    lightHaptic();
    // Quick action for adding a new task or viewing today's schedule
    const today = new Date();
    setCurrentDate(today);
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Calendar</h1>
          <p className="text-muted-foreground">
            View your scheduled tasks and track progress
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <SkeletonCard key={i} showBadge lines={2} />
          ))}
        </div>
        
        <SkeletonCard lines={8} className="min-h-[400px]" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Calendar</h1>
          <p className="text-muted-foreground">
            View your scheduled tasks and track progress
          </p>
        </div>

        <NetworkStatus />

        {/* Task Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="touch-card">
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
          
          <Card className="touch-card">
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
          
          <Card className="touch-card">
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

        <Card className="touch-card">
          <CardContent className="p-0">
            <CalendarView
              tasks={tasks}
              onTaskClick={handleTaskClick}
              isAdmin={false}
            />
          </CardContent>
        </Card>

        <FloatingActionButton
          onClick={handleQuickAction}
          icon={Plus}
          label="Today"
          className="md:hidden"
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
    </PullToRefresh>
  );
}