import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Worker } from '@/hooks/useWorkers';
import { Plus, X } from 'lucide-react';

interface AddWorkersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  availableWorkers: Worker[];
  onAssignWorkers: (workerIds: string[]) => void;
  isLoading?: boolean;
}

export function AddWorkersDrawer({ 
  isOpen, 
  onClose, 
  availableWorkers, 
  onAssignWorkers, 
  isLoading 
}: AddWorkersDrawerProps) {
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);

  const handleWorkerToggle = (workerId: string) => {
    setSelectedWorkerIds(prev => 
      prev.includes(workerId) 
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  const handleAssign = () => {
    if (selectedWorkerIds.length > 0) {
      onAssignWorkers(selectedWorkerIds);
      setSelectedWorkerIds([]);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedWorkerIds([]);
    onClose();
  };

  return (
    <Drawer open={isOpen} onOpenChange={handleClose}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <DrawerTitle>Add Workers to Project</DrawerTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 p-4">
          {availableWorkers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">All available workers are already assigned to this project.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableWorkers.map((worker) => (
                <div key={worker.id} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={selectedWorkerIds.includes(worker.id)}
                    onCheckedChange={() => handleWorkerToggle(worker.id)}
                  />
                  <Avatar>
                    <AvatarImage src={worker.avatar_url} />
                    <AvatarFallback>
                      {worker.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{worker.full_name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{worker.role}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DrawerFooter className="border-t">
          <div className="flex space-x-2">
            <Button
              onClick={handleAssign}
              disabled={selectedWorkerIds.length === 0 || isLoading}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              Assign {selectedWorkerIds.length} Worker{selectedWorkerIds.length !== 1 ? 's' : ''}
            </Button>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}