import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KanbanColumn } from '@/components/admin/KanbanColumn';
import { TaskDrawer } from '@/components/admin/TaskDrawer';
import { useTasks } from '@/hooks/useTasks';

interface TasksBoardTabProps {
  projectId: string;
}

export function TasksBoardTab({ projectId }: TasksBoardTabProps) {
  const { data: tasks = [], isLoading } = useTasks(projectId);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
        <Button className="gap-2" onClick={() => setDrawerOpen(true)}>
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <KanbanColumn
          title="Backlog"
          tasks={backlogTasks}
          status="todo"
          projectId={projectId}
        />
        <KanbanColumn
          title="Active"
          tasks={activeTasks}
          status="in_progress"
          projectId={projectId}
        />
        <KanbanColumn
          title="Done"
          tasks={doneTasks}
          status="done"
          projectId={projectId}
        />
      </div>

      {/* Task Drawer */}
      <TaskDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        projectId={projectId}
      />
    </div>
  );
}