import React, { useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar, RefreshCw, Settings, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCalendarEvents, useCalendarSyncSettings, useUpdateCalendarEvent, useManualSync } from '@/hooks/useCalendarEvents';
import { useCalendarTasks } from '@/hooks/useCalendarTasks';
import { CalendarEventDialog } from '@/components/calendar/CalendarEventDialog';
import { CalendarSyncSettings } from '@/components/calendar/CalendarSyncSettings';
import { EventDetailsModal } from '@/components/calendar/EventDetailsModal';

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);

  // Fetch calendar data
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  const { data: calendarEvents, isLoading: eventsLoading } = useCalendarEvents(monthStart, monthEnd);
  const { data: calendarTasks, isLoading: tasksLoading } = useCalendarTasks(monthStart.toISOString().split('T')[0], monthEnd.toISOString().split('T')[0]);
  const { data: syncSettings } = useCalendarSyncSettings();
  
  const updateCalendarEvent = useUpdateCalendarEvent();
  const triggerSync = useManualSync();

  // Combine calendar events and tasks for FullCalendar
  const allEvents = [
    ...(calendarEvents || []).map(event => ({
      id: `event-${event.id}`,
      title: event.title,
      start: event.starts_at,
      end: event.ends_at,
      allDay: event.all_day,
      backgroundColor: getEventColor(event.provider, event.sync_status),
      borderColor: getEventColor(event.provider, event.sync_status),
      extendedProps: {
        type: 'calendar_event',
        data: event,
        description: event.description,
        location: event.location,
        provider: event.provider,
        syncStatus: event.sync_status
      }
    })),
    ...(calendarTasks || []).map(task => ({
      id: `task-${task.id}`,
      title: `📋 ${task.title}`,
      start: task.start_date,
      end: task.end_date,
      allDay: true,
      backgroundColor: '#3b82f6',
      borderColor: '#2563eb',
      extendedProps: {
        type: 'task',
        data: task,
        description: task.description,
        status: task.status,
        priority: task.priority
      }
    }))
  ];

  const handleDateSelect = useCallback((selectInfo: any) => {
    setSelectedDate(new Date(selectInfo.start));
    setShowEventDialog(true);
  }, []);

  const handleEventClick = useCallback((clickInfo: any) => {
    setSelectedEvent(clickInfo.event);
    setShowEventDetails(true);
  }, []);

  const handleEventDrop = useCallback(async (dropInfo: any) => {
    const { event } = dropInfo;
    const eventData = event.extendedProps.data;
    
    if (event.extendedProps.type === 'calendar_event') {
      try {
        await updateCalendarEvent.mutateAsync({
          id: eventData.id,
          starts_at: event.start.toISOString(),
          ends_at: event.end ? event.end.toISOString() : event.start.toISOString()
        });
      } catch (error) {
        // Revert the change if update fails
        dropInfo.revert();
      }
    }
  }, [updateCalendarEvent]);

  const handleManualSync = useCallback(() => {
    triggerSync.mutate();
  }, [triggerSync]);

  function getEventColor(provider: string, syncStatus: string) {
    if (syncStatus === 'error') return '#ef4444';
    if (syncStatus === 'pending') return '#f59e0b';
    
    switch (provider) {
      case 'google': return '#4285f4';
      case 'outlook': return '#0078d4';
      case 'internal': return '#10b981';
      default: return '#6b7280';
    }
  }

  const getSyncStatusBadge = () => {
    if (!syncSettings) return null;
    
    const isConnected = syncSettings.google_enabled || syncSettings.outlook_enabled;
    return (
      <Badge variant={isConnected ? 'default' : 'secondary'} className="ml-2">
        {isConnected ? 'Sync Enabled' : 'No Sync'}
      </Badge>
    );
  };

  if (eventsLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Calendar className="h-8 w-8 mr-3" />
          <div>
            <h1 className="text-3xl font-bold">Calendar</h1>
            <p className="text-muted-foreground">
              Manage your schedule and sync with external calendars
              {getSyncStatusBadge()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSync}
            disabled={triggerSync.isPending}
          >
            {triggerSync.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Sync Now
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSyncSettings(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Sync Settings
          </Button>
          
          <Button
            onClick={() => {
              setSelectedDate(new Date());
              setShowEventDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="p-6">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            initialView="dayGridMonth"
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            weekends={true}
            events={allEvents}
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            editable={true}
            droppable={true}
            height="auto"
            eventContent={(eventInfo) => (
              <div className="p-1 text-xs">
                <div className="font-medium truncate">{eventInfo.event.title}</div>
                {eventInfo.event.extendedProps.location && (
                  <div className="text-xs opacity-75 truncate">
                    📍 {eventInfo.event.extendedProps.location}
                  </div>
                )}
                {eventInfo.event.extendedProps.syncStatus === 'pending' && (
                  <div className="text-xs opacity-75">⏳ Syncing...</div>
                )}
                {eventInfo.event.extendedProps.syncStatus === 'error' && (
                  <div className="text-xs opacity-75">❌ Sync Error</div>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Legend</CardTitle>
          <CardDescription>
            Calendar event sources and sync status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-[#4285f4]"></div>
              <span className="text-sm">Google Calendar</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-[#0078d4]"></div>
              <span className="text-sm">Outlook Calendar</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-[#10b981]"></div>
              <span className="text-sm">BuildBuddy Events</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-[#3b82f6]"></div>
              <span className="text-sm">Project Tasks</span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-[#f59e0b]"></div>
                <span className="text-sm">Pending Sync</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-[#ef4444]"></div>
                <span className="text-sm">Sync Error</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-[#6b7280]"></div>
                <span className="text-sm">Synced</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CalendarEventDialog
        open={showEventDialog}
        onOpenChange={setShowEventDialog}
        selectedDate={selectedDate}
      />
      
      <CalendarSyncSettings
        open={showSyncSettings}
        onOpenChange={setShowSyncSettings}
      />
      
      <EventDetailsModal
        open={showEventDetails}
        onOpenChange={setShowEventDetails}
        event={selectedEvent}
      />
    </div>
  );
}