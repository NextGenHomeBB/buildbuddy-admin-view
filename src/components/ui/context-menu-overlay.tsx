import React from 'react';
import { cn } from '@/lib/utils';

interface ContextMenuItem {
  label: string;
  action: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  shortcut?: string;
}

interface ContextMenuOverlayProps {
  isOpen: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onItemClick: (item: ContextMenuItem) => void;
  onClose: () => void;
}

export function ContextMenuOverlay({
  isOpen,
  x,
  y,
  items,
  onItemClick,
  onClose
}: ContextMenuOverlayProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50"
      onClick={onClose}
    >
      <div
        className="absolute bg-popover border border-border rounded-md shadow-lg py-1 min-w-48 z-50"
        style={{ 
          left: Math.min(x, window.innerWidth - 200),
          top: Math.min(y, window.innerHeight - items.length * 40)
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item, index) => (
          <button
            key={index}
            className={cn(
              "w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between transition-colors",
              item.disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => onItemClick(item)}
            disabled={item.disabled}
          >
            <div className="flex items-center gap-2">
              {item.icon && <item.icon className="h-4 w-4" />}
              <span>{item.label}</span>
            </div>
            {item.shortcut && (
              <span className="text-xs text-muted-foreground">{item.shortcut}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}