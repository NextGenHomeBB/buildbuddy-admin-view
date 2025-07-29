import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const matchingShortcut = shortcuts.find(shortcut => {
      return (
        shortcut.key.toLowerCase() === event.key.toLowerCase() &&
        !!shortcut.ctrlKey === event.ctrlKey &&
        !!shortcut.shiftKey === event.shiftKey &&
        !!shortcut.altKey === event.altKey &&
        !!shortcut.metaKey === event.metaKey
      );
    });

    if (matchingShortcut) {
      event.preventDefault();
      matchingShortcut.action();
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { shortcuts };
}

// Common keyboard shortcuts hook for admin
export function useAdminKeyboardShortcuts() {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'n',
      ctrlKey: true,
      action: () => {
        // Trigger new project creation
        const event = new CustomEvent('admin:new-project');
        window.dispatchEvent(event);
      },
      description: 'Create new project'
    },
    {
      key: 'k',
      ctrlKey: true,
      action: () => {
        // Trigger search
        const event = new CustomEvent('admin:search');
        window.dispatchEvent(event);
      },
      description: 'Open search'
    },
    {
      key: '/',
      action: () => {
        // Show keyboard shortcuts help
        const event = new CustomEvent('admin:show-shortcuts');
        window.dispatchEvent(event);
      },
      description: 'Show keyboard shortcuts'
    }
  ];

  return useKeyboardShortcuts(shortcuts);
}