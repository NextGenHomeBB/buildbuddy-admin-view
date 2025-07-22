
import { useState, useEffect } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KanbanColumn } from '@/components/admin/KanbanColumn';
import { TaskDrawer } from '@/components/admin/TaskDrawer';
import { TaskDetailsModal } from '@/components/admin/TaskDetailsModal';
import { useTasks, Task } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface TasksBoardTabProps {
  projectId: string;
}

export function TasksBoardTab({ projectId }: TasksBoardTabProps) {
  const { data: tasks = [], isLoading, refetch } = useTasks(projectId);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('Task change detected:', payload);
          
          // Invalidate and refetch tasks
          queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
          
          // Show notification for status changes
          if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
            const oldStatus = payload.old.status;
            const newStatus = payload.new.status;
            
            if (oldStatus !== newStatus) {
              toast({
                title: "Task Updated",
                description: `Task "${payload.new.title}" moved to ${newStatus.replace('_', ' ')}`,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient, toast]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailsModalOpen(true);
  };

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Task data has been refreshed",
    });
  };

  // Group tasks by status
  const backlogTasks = tasks.filter(task => task.status === 'todo');
  const activeTasks = tasks.filter(task => task.status === 'in_progress');
  const doneTasks = tasks.filter(task => task.status === 'done');

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Task Board</h3>
          <p className="text-sm text-muted-foreground">Manage tasks across different phases</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button className="gap-2" onClick={() => setDrawerOpen(true)}>
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <KanbanColumn
          title="Backlog"
          tasks={backlogTasks}
          status="todo"
          projectId={projectId}
          onTaskClick={handleTaskClick}
        />
        <KanbanColumn
          title="Active"
          tasks={activeTasks}
          status="in_progress"
          projectId={projectId}
          onTaskClick={handleTaskClick}
        />
        <KanbanColumn
          title="Done"
          tasks={doneTasks}
          status="done"
          projectId={projectId}
          onTaskClick={handleTaskClick}
        />
      </div>

      {/* Task Drawer */}
      <TaskDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        projectId={projectId}
      />

      {/* Task Details Modal */}
      <TaskDetailsModal
        task={selectedTask}
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedTask(null);
        }}
      />
    </div>
  );
}
