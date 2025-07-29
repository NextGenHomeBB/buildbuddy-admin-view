import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { TaskListItem } from './TaskListItem';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee?: string;
  project?: { name: string };
  assignee_profile?: { full_name: string; avatar_url?: string };
}

interface DraggableTaskListItemProps {
  task: Task;
  showRemoveButton?: boolean;
  isSelected?: boolean;
  onSelect?: (taskId: string, isSelected: boolean) => void;
}

export function DraggableTaskListItem({ 
  task, 
  showRemoveButton = false, 
  isSelected = false, 
  onSelect 
}: DraggableTaskListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative ${isSelected ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="flex items-center gap-2">
        {/* Selection Checkbox */}
        {onSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(task.id, e.target.checked)}
            className="rounded border-border text-primary focus:ring-primary"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Task Item */}
        <div className="flex-1">
          <TaskListItem task={task} showRemoveButton={showRemoveButton} />
        </div>
      </div>
    </div>
  );
}