
import { useState, useEffect } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TasksTable } from '@/components/admin/TasksTable';
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

  const handleTaskEdit = (task: Task) => {
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

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-4">Loading tasks...</p>
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

      {/* Tasks Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold text-foreground">{tasks.length}</div>
          <div className="text-sm text-muted-foreground">Total Tasks</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold text-blue-600">
            {tasks.filter(t => t.status === 'todo').length}
          </div>
          <div className="text-sm text-muted-foreground">Backlog</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold text-yellow-600">
            {tasks.filter(t => t.status === 'in_progress').length}
          </div>
          <div className="text-sm text-muted-foreground">Active</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold text-green-600">
            {tasks.filter(t => t.status === 'done').length}
          </div>
          <div className="text-sm text-muted-foreground">Done</div>
        </div>
      </div>

      {/* Tasks Table */}
      <TasksTable
        tasks={tasks}
        projectId={projectId}
        onTaskEdit={handleTaskEdit}
      />

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
