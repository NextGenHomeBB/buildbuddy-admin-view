import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KanbanColumn } from '@/components/admin/KanbanColumn';
import { TaskCard } from '@/components/admin/TaskCard';
import { TaskDrawer } from '@/components/admin/TaskDrawer';
import { useTasks, Task, useUpdateTask } from '@/hooks/useTasks';

interface ProjectTasksTabProps {
  projectId: string;
}

export function ProjectTasksTab({ projectId }: ProjectTasksTabProps) {
  const { data: tasks = [] } = useTasks(projectId);
  const updateTaskMutation = useUpdateTask();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const todoTasks = tasks.filter(task => task.status === 'todo');
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress');
  const doneTasks = tasks.filter(task => task.status === 'done');

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as Task['status'];
    
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    updateTaskMutation.mutate({
      id: taskId,
      status: newStatus
    });
  };

  const handleTaskClick = (task: Task) => {
    setEditingTask(task);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setEditingTask(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Project Tasks</h2>
          <p className="text-muted-foreground mt-1">
            Drag and drop tasks between columns to update their status
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Kanban Board */}
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KanbanColumn
            title="To Do"
            tasks={todoTasks}
            status="todo"
            projectId={projectId}
            onTaskClick={handleTaskClick}
          />
          <KanbanColumn
            title="In Progress"
            tasks={inProgressTasks}
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

        <DragOverlay>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              isDragging
              onClick={() => {}}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Drawer */}
      <TaskDrawer
        isOpen={drawerOpen}
        onClose={handleDrawerClose}
        projectId={projectId}
        editingTask={editingTask}
      />
    </div>
  );
}