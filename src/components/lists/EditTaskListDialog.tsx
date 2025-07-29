import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TaskList, useUpdateTaskList } from '@/hooks/useTaskLists';

const colors = [
  '#3478F6', '#10B981', '#F59E0B', '#EF4444', 
  '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
];

interface EditTaskListDialogProps {
  list: TaskList;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTaskListDialog({ list, open, onOpenChange }: EditTaskListDialogProps) {
  const [name, setName] = useState(list.name);
  const [selectedColor, setSelectedColor] = useState(list.color_hex);
  const updateTaskList = useUpdateTaskList();

  useEffect(() => {
    if (open) {
      setName(list.name);
      setSelectedColor(list.color_hex);
    }
  }, [open, list]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    updateTaskList.mutate(
      { 
        id: list.id,
        name: name.trim(), 
        color_hex: selectedColor 
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border">
        <DialogHeader>
          <DialogTitle>Edit List</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">List Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter list name..."
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full transition-all ${
                    selectedColor === color
                      ? 'ring-2 ring-primary ring-offset-2'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || updateTaskList.isPending}
            >
              {updateTaskList.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}