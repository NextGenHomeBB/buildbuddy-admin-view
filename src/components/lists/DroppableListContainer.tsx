import { useDroppable } from '@dnd-kit/core';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DroppableListContainerProps {
  id: string;
  children: ReactNode;
  className?: string;
  emptyMessage?: string;
}

export function DroppableListContainer({ 
  id, 
  children, 
  className, 
  emptyMessage = "Drop tasks here" 
}: DroppableListContainerProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[100px] rounded-lg border-2 border-dashed border-border transition-colors",
        isOver && "border-primary bg-primary/5",
        className
      )}
    >
      {children || (
        <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}