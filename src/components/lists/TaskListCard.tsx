import { useState } from 'react';
import { MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { TaskList, useDeleteTaskList } from '@/hooks/useTaskLists';
import { EditTaskListDialog } from './EditTaskListDialog';

interface TaskListCardProps {
  list: TaskList;
  onClick: () => void;
}

export function TaskListCard({ list, onClick }: TaskListCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const deleteTaskList = useDeleteTaskList();

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this list? All tasks will be moved to unassigned.')) {
      deleteTaskList.mutate(list.id);
    }
  };

  return (
    <>
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow bg-card border-border"
        onClick={onClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: list.color_hex }}
              />
              <h3 className="font-semibold text-card-foreground truncate">
                {list.name}
              </h3>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-background border shadow-lg z-50" align="end">
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEditDialog(true);
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary" className="text-xs">
            {list.task_count || 0} tasks
          </Badge>
        </CardContent>
      </Card>

      <EditTaskListDialog
        list={list}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />
    </>
  );
}