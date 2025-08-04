import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Edit, Trash2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useDeleteCalendarEvent } from '@/hooks/useCalendarEvents';

interface EventDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: any;
}

export function EventDetailsModal({ open, onOpenChange, event }: EventDetailsModalProps) {
  const deleteEvent = useDeleteCalendarEvent();

  if (!event) return null;

  const eventData = event.extendedProps?.data;
  const isCalendarEvent = event.extendedProps?.type === 'calendar_event';
  const isTask = event.extendedProps?.type === 'task';

  const handleDelete = async () => {
    if (isCalendarEvent && eventData?.id) {
      try {
        await deleteEvent.mutateAsync(eventData.id);
        onOpenChange(false);
      } catch (error) {
        console.error('Failed to delete event:', error);
      }
    }
  };

  const getProviderInfo = (provider: string) => {
    switch (provider) {
      case 'google':
        return { name: 'Google Calendar', color: '#4285f4' };
      case 'outlook':
        return { name: 'Outlook Calendar', color: '#0078d4' };
      case 'internal':
        return { name: 'BuildBuddy', color: '#10b981' };
      default:
        return { name: 'Unknown', color: '#6b7280' };
    }
  };

  const getSyncStatusInfo = (status: string) => {
    switch (status) {
      case 'synced':
        return { label: 'Synced', color: 'default' };
      case 'pending':
        return { label: 'Pending Sync', color: 'secondary' };
      case 'error':
        return { label: 'Sync Error', color: 'destructive' };
      default:
        return { label: 'Unknown', color: 'secondary' };
    }
  };

  const formatEventTime = (start: Date, end: Date, allDay: boolean) => {
    if (allDay) {
      if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
        return format(start, 'MMMM d, yyyy');
      } else {
        return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
      }
    } else {
      return `${format(start, 'MMM d, yyyy h:mm a')} - ${format(end, 'h:mm a')}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {isTask ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-[#3b82f6]"></div>
                <span>Project Task</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Calendar Event</span>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event Title */}
          <div>
            <h2 className="text-xl font-semibold">{event.title}</h2>
          </div>

          {/* Provider and Sync Status */}
          {isCalendarEvent && (
            <div className="flex items-center space-x-2">
              {eventData?.provider && (
                <Badge 
                  variant="outline" 
                  style={{ 
                    borderColor: getProviderInfo(eventData.provider).color,
                    color: getProviderInfo(eventData.provider).color 
                  }}
                >
                  {getProviderInfo(eventData.provider).name}
                </Badge>
              )}
              {eventData?.sync_status && (
                <Badge variant={getSyncStatusInfo(eventData.sync_status).color as any}>
                  {getSyncStatusInfo(eventData.sync_status).label}
                </Badge>
              )}
            </div>
          )}

          {/* Task Status and Priority */}
          {isTask && (
            <div className="flex items-center space-x-2">
              <Badge variant={
                eventData?.status === 'done' ? 'default' :
                eventData?.status === 'in_progress' ? 'secondary' : 'outline'
              }>
                {eventData?.status?.replace('_', ' ') || 'To Do'}
              </Badge>
              <Badge variant={
                eventData?.priority === 'high' ? 'destructive' :
                eventData?.priority === 'medium' ? 'secondary' : 'outline'
              }>
                {eventData?.priority || 'Medium'} Priority
              </Badge>
            </div>
          )}

          {/* Time */}
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {formatEventTime(
                new Date(event.start), 
                new Date(event.end || event.start),
                event.allDay
              )}
            </span>
          </div>

          {/* Location */}
          {eventData?.location && (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{eventData.location}</span>
            </div>
          )}

          {/* Description */}
          {eventData?.description && (
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                {eventData.description}
              </p>
            </div>
          )}

          {/* Sync Error */}
          {eventData?.sync_error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-800 mb-1">Sync Error</h4>
              <p className="text-red-700 text-sm">{eventData.sync_error}</p>
            </div>
          )}

          {/* External ID */}
          {eventData?.external_id && (
            <div className="text-xs text-muted-foreground">
              External ID: {eventData.external_id}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <div className="flex space-x-2">
            {isTask && (
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Task
              </Button>
            )}
          </div>
          
          {isCalendarEvent && (
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDelete}
                disabled={deleteEvent.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}