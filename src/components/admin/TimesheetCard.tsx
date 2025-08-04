import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Clock, Edit, Trash2, RotateCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export interface TimeSheet {
  id: string;
  user_id: string;
  project_id: string | null;
  work_date: string;
  hours: number;
  note: string | null;
  created_at: string;
  break_duration?: number;
  shift_type?: string;
  location?: string;
  sync_status?: 'pending' | 'synced' | 'failed';
}

interface TimesheetCardProps {
  timesheet: TimeSheet;
  onEdit?: (timesheet: TimeSheet) => void;
  onDelete?: (id: string) => void;
  onSync?: (id: string) => void;
}

export function TimesheetCard({ timesheet, onEdit, onDelete, onSync }: TimesheetCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    hours: timesheet.hours.toString(),
    note: timesheet.note || '',
    location: timesheet.location || ''
  });
  const { toast } = useToast();

  const handleEdit = () => {
    const updatedTimesheet = {
      ...timesheet,
      hours: parseFloat(editForm.hours),
      note: editForm.note,
      location: editForm.location
    };
    onEdit?.(updatedTimesheet);
    setIsEditDialogOpen(false);
    toast({
      title: "Timesheet updated",
      description: "Your time entry has been updated successfully."
    });
  };

  const getSyncStatusIcon = () => {
    switch (timesheet.sync_status) {
      case 'synced':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <RotateCw className="h-4 w-4 text-warning" />;
    }
  };

  const getSyncStatusColor = () => {
    switch (timesheet.sync_status) {
      case 'synced':
        return 'success';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {format(parseISO(timesheet.work_date), 'MMM dd, yyyy')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={getSyncStatusColor() as any}>
              <div className="flex items-center gap-1">
                {getSyncStatusIcon()}
                {timesheet.sync_status || 'pending'}
              </div>
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Time Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground">Hours Worked</Label>
            <p className="text-lg font-semibold">{timesheet.hours}h</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Shift Type</Label>
            <p className="capitalize">{timesheet.shift_type || 'regular'}</p>
          </div>
        </div>

        {/* Break Duration */}
        {timesheet.break_duration && timesheet.break_duration > 0 && (
          <div>
            <Label className="text-sm text-muted-foreground">Break Duration</Label>
            <p>{timesheet.break_duration}h</p>
          </div>
        )}

        {/* Location */}
        {timesheet.location && (
          <div>
            <Label className="text-sm text-muted-foreground">Location</Label>
            <p>{timesheet.location}</p>
          </div>
        )}

        {/* Notes */}
        {timesheet.note && (
          <div>
            <Label className="text-sm text-muted-foreground">Notes</Label>
            <p className="text-sm">{timesheet.note}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Timesheet Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="hours">Hours Worked</Label>
                  <Input
                    id="hours"
                    type="number"
                    step="0.25"
                    min="0"
                    max="24"
                    value={editForm.hours}
                    onChange={(e) => setEditForm(prev => ({ ...prev, hours: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={editForm.location}
                    onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Work location"
                  />
                </div>
                <div>
                  <Label htmlFor="note">Notes</Label>
                  <Textarea
                    id="note"
                    value={editForm.note}
                    onChange={(e) => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                    placeholder="Add notes about your work..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleEdit} className="flex-1">
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {timesheet.sync_status !== 'synced' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSync?.(timesheet.id)}
              className="flex-1"
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Sync
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete?.(timesheet.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}