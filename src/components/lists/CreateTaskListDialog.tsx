import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateTaskList } from '@/hooks/useTaskLists';

const colors = [
  '#3478F6', '#10B981', '#F59E0B', '#EF4444', 
  '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
];

interface CreateTaskListDialogProps {
  trigger?: React.ReactNode;
}

export function CreateTaskListDialog({ trigger }: CreateTaskListDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const createTaskList = useCreateTaskList();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createTaskList.mutate(
      { name: name.trim(), color_hex: selectedColor },
      {
        onSuccess: () => {
          setOpen(false);
          setName('');
          setSelectedColor(colors[0]);
        }
      }
    );
  };

  const triggerElement = trigger || (
    <Button className="gap-2">
      <Plus className="h-4 w-4" />
      New List
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerElement}
      </DialogTrigger>
      <DialogContent className="bg-background border">
        <DialogHeader>
          <DialogTitle>Create New List</DialogTitle>
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
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createTaskList.isPending}
            >
              {createTaskList.isPending ? 'Creating...' : 'Create List'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}