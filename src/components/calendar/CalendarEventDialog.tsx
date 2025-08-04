import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { useCreateCalendarEvent } from '@/hooks/useCalendarEvents';
import { format } from 'date-fns';

interface CalendarEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date | null;
  event?: any;
}

export function CalendarEventDialog({ 
  open, 
  onOpenChange, 
  selectedDate,
  event 
}: CalendarEventDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    starts_at: '',
    ends_at: '',
    all_day: false
  });

  const createEvent = useCreateCalendarEvent();

  // Initialize form data
  useEffect(() => {
    if (selectedDate && open) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const timeStr = format(selectedDate, 'HH:mm');
      
      setFormData({
        title: '',
        description: '',
        location: '',
        starts_at: `${dateStr}T${timeStr}`,
        ends_at: `${dateStr}T${format(new Date(selectedDate.getTime() + 60 * 60 * 1000), 'HH:mm')}`,
        all_day: false
      });
    }
  }, [selectedDate, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createEvent.mutateAsync({
        title: formData.title,
        description: formData.description || undefined,
        location: formData.location || undefined,
        starts_at: formData.all_day 
          ? `${formData.starts_at.split('T')[0]}T00:00:00.000Z`
          : new Date(formData.starts_at).toISOString(),
        ends_at: formData.all_day
          ? `${formData.ends_at.split('T')[0]}T23:59:59.999Z`
          : new Date(formData.ends_at).toISOString(),
        all_day: formData.all_day
      });
      
      onOpenChange(false);
      setFormData({
        title: '',
        description: '',
        location: '',
        starts_at: '',
        ends_at: '',
        all_day: false
      });
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Create New Event
          </DialogTitle>
          <DialogDescription>
            Add a new event to your calendar. It will be synced with your connected calendars.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter event title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter event description (optional)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              Location
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="Enter location (optional)"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="all-day"
              checked={formData.all_day}
              onCheckedChange={(checked) => handleInputChange('all_day', checked)}
            />
            <Label htmlFor="all-day">All day event</Label>
          </div>

          {!formData.all_day ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="starts_at" className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Start Time
                </Label>
                <Input
                  id="starts_at"
                  type="datetime-local"
                  value={formData.starts_at}
                  onChange={(e) => handleInputChange('starts_at', e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ends_at" className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  End Time
                </Label>
                <Input
                  id="ends_at"
                  type="datetime-local"
                  value={formData.ends_at}
                  onChange={(e) => handleInputChange('ends_at', e.target.value)}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.starts_at.split('T')[0]}
                  onChange={(e) => {
                    handleInputChange('starts_at', `${e.target.value}T00:00`);
                    if (!formData.ends_at.split('T')[0]) {
                      handleInputChange('ends_at', `${e.target.value}T23:59`);
                    }
                  }}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.ends_at.split('T')[0]}
                  onChange={(e) => handleInputChange('ends_at', `${e.target.value}T23:59`)}
                  required
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEvent.isPending}>
              {createEvent.isPending ? 'Creating...' : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}