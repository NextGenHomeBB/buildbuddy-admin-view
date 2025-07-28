import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarView } from '@/components/calendar/CalendarView';
import { TaskDrawer } from '@/components/admin/TaskDrawer';
import { TaskDetailsModal } from '@/components/admin/TaskDetailsModal';
import { useCalendarTasks, useUpdateTaskSchedule, CalendarTask } from '@/hooks/useCalendarTasks';
import { useProjects } from '@/hooks/useProjects';
import { toast } from '@/hooks/use-toast';

export function AdminCalendar() {
  const [currentDate] = useState(new Date());
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const [editingTask, setEditingTask] = useState<CalendarTask | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  const { data: tasks = [], isLoading } = useCalendarTasks(
    format(monthStart, 'yyyy-MM-dd'),
    format(monthEnd, 'yyyy-MM-dd')
  );

  // Debug logging
  console.log('AdminCalendar Debug:', {
    monthStart: format(monthStart, 'yyyy-MM-dd'),
    monthEnd: format(monthEnd, 'yyyy-MM-dd'),
    tasksCount: tasks.length,
    tasks: tasks,
    isLoading
  });
  
  const { data: projects = [] } = useProjects();
  const updateTaskSchedule = useUpdateTaskSchedule();

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setEditingTask(null);
    setIsTaskDrawerOpen(true);
  };

  const handleTaskClick = (task: CalendarTask) => {
    setSelectedTask(task);
  };

  const handleTaskMove = async (taskId: string, newDate: Date) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const startDate = format(newDate, 'yyyy-MM-dd');
    let endDate = startDate;
    
    if (task.duration_days && task.duration_days > 1) {
      const endDateTime = new Date(newDate);
      endDateTime.setDate(endDateTime.getDate() + task.duration_days - 1);
      endDate = format(endDateTime, 'yyyy-MM-dd');
    }

    try {
      await updateTaskSchedule.mutateAsync({
        taskId,
        start_date: startDate,
        end_date: endDate,
        duration_days: task.duration_days || 1,
      });
    } catch (error) {
      console.error('Error moving task:', error);
    }
  };

  const handleEditTask = (task: CalendarTask) => {
    setEditingTask(task);
    setSelectedDate(null);
    setIsTaskDrawerOpen(true);
  };

  const handleCloseTaskDrawer = () => {
    setIsTaskDrawerOpen(false);
    setEditingTask(null);
    setSelectedDate(null);
  };

  const handleCloseTaskModal = () => {
    setSelectedTask(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-muted-foreground">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">
            Schedule and manage tasks across projects
          </p>
        </div>
        <Button onClick={() => setIsTaskDrawerOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      <CalendarView
        tasks={tasks}
        onTaskClick={handleTaskClick}
        onDateClick={handleDateClick}
        onTaskMove={handleTaskMove}
        isAdmin={true}
      />

      <TaskDrawer
        isOpen={isTaskDrawerOpen}
        onClose={handleCloseTaskDrawer}
        projectId={projects[0]?.id || ''}
        editingTask={editingTask ? {
          id: editingTask.id,
          title: editingTask.title,
          description: editingTask.description || '',
          status: editingTask.status,
          priority: editingTask.priority,
          assignee: editingTask.assignee || '',
          project_id: editingTask.project_id || '',
          phase_id: editingTask.phase_id || '',
          created_at: editingTask.created_at,
          updated_at: editingTask.updated_at,
          completed_at: null,
        } : undefined}
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