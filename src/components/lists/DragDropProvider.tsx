import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { TaskListItem } from './TaskListItem';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  position?: number;
  list_id?: string;
  assignee?: string;
  project?: { name: string };
  assignee_profile?: { full_name: string; avatar_url?: string };
}

interface DragDropProviderProps {
  children: ReactNode;
  tasks: Task[];
  onTaskMove: (taskId: string, newListId: string | null, newPosition: number) => void;
  onTaskReorder: (taskId: string, newPosition: number) => void;
}

export function DragDropProvider({ children, tasks, onTaskMove, onTaskReorder }: DragDropProviderProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    // Check if dropping on a list container
    if (overId.startsWith('list-')) {
      const newListId = overId.replace('list-', '') || null;
      onTaskMove(activeTaskId, newListId, 0);
      return;
    }

    // Check if dropping on unassigned container
    if (overId === 'unassigned') {
      onTaskMove(activeTaskId, null, 0);
      return;
    }

    // Handle reordering within same list
    const activeTask = tasks.find(t => t.id === activeTaskId);
    const overTask = tasks.find(t => t.id === overId);

    if (activeTask && overTask && activeTask.list_id === overTask.list_id) {
      const oldIndex = tasks.findIndex(t => t.id === activeTaskId);
      const newIndex = tasks.findIndex(t => t.id === overId);
      
      if (oldIndex !== newIndex) {
        const reorderedTasks = arrayMove(tasks, oldIndex, newIndex);
        const newPosition = reorderedTasks.findIndex(t => t.id === activeTaskId);
        onTaskReorder(activeTaskId, newPosition);
      }
    }
  };

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
      
      {createPortal(
        <DragOverlay>
          {activeTask && (
            <div className="opacity-90 rotate-3 scale-105">
              <TaskListItem task={activeTask} />
            </div>
          )}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}