import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcut {
  key: string;
  description: string;
  category: string;
}

const shortcuts: KeyboardShortcut[] = [
  { key: 'Ctrl + N', description: 'Create new project', category: 'General' },
  { key: 'Ctrl + K', description: 'Open search', category: 'General' },
  { key: '/', description: 'Show keyboard shortcuts', category: 'Help' },
  { key: 'Ctrl + Shift + P', description: 'Command palette', category: 'General' },
  { key: 'Escape', description: 'Close dialog/menu', category: 'Navigation' },
  { key: 'Tab', description: 'Navigate between elements', category: 'Navigation' },
  { key: 'Shift + Tab', description: 'Navigate backwards', category: 'Navigation' },
  { key: 'Enter', description: 'Confirm action', category: 'Actions' },
  { key: 'Space', description: 'Toggle selection', category: 'Actions' },
];

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  const categories = [...new Set(shortcuts.map(s => s.category))];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {categories.map(category => (
            <div key={category}>
              <h3 className="font-semibold text-lg mb-3">{category}</h3>
              <div className="space-y-2">
                {shortcuts
                  .filter(s => s.category === category)
                  .map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between py-2">
                      <span className="text-sm">{shortcut.description}</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {shortcut.key}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}