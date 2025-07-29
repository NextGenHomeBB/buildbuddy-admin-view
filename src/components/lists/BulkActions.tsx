import { useState } from 'react';
import { MoreHorizontal, Trash2, Archive, UserPlus, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BulkActionsProps {
  selectedTaskIds: string[];
  onBulkAssign: (assigneeId: string) => void;
  onBulkMoveToList: (listId: string) => void;
  onBulkDelete: () => void;
  onBulkStatusChange: (status: string) => void;
  onClearSelection: () => void;
  availableAssignees: Array<{ id: string; name: string }>;
  availableLists: Array<{ id: string; name: string; color_hex: string }>;
}

export function BulkActions({
  selectedTaskIds,
  onBulkAssign,
  onBulkMoveToList,
  onBulkDelete,
  onBulkStatusChange,
  onClearSelection,
  availableAssignees,
  availableLists,
}: BulkActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [selectedList, setSelectedList] = useState<string>('');

  if (selectedTaskIds.length === 0) {
    return null;
  }

  const handleBulkAssign = () => {
    if (selectedAssignee) {
      onBulkAssign(selectedAssignee);
      setSelectedAssignee('');
    }
  };

  const handleBulkMoveToList = () => {
    if (selectedList) {
      onBulkMoveToList(selectedList);
      setSelectedList('');
    }
  };

  const handleDeleteConfirm = () => {
    onBulkDelete();
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div className="flex items-center gap-2 p-3 bg-muted/50 border border-border rounded-lg">
        <Badge variant="secondary" className="gap-1">
          {selectedTaskIds.length} selected
        </Badge>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkStatusChange('done')}
          >
            Mark as Done
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkStatusChange('in_progress')}
          >
            Mark in Progress
          </Button>
        </div>

        {/* Assignee Selector */}
        {availableAssignees.length > 0 && (
          <div className="flex items-center gap-2">
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Assign to..." />
              </SelectTrigger>
              <SelectContent>
                {availableAssignees.map(assignee => (
                  <SelectItem key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkAssign}
              disabled={!selectedAssignee}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* List Selector */}
        {availableLists.length > 0 && (
          <div className="flex items-center gap-2">
            <Select value={selectedList} onValueChange={setSelectedList}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Move to list..." />
              </SelectTrigger>
              <SelectContent>
                {availableLists.map(list => (
                  <SelectItem key={list.id} value={list.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: list.color_hex }}
                      />
                      {list.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkMoveToList}
              disabled={!selectedList}
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* More Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onBulkStatusChange('todo')}>
              Mark as To Do
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Tasks
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Selection */}
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          Clear
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tasks</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedTaskIds.length} selected task(s)? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}