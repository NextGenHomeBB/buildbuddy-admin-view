import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  location?: string;
  external_id?: string;
  provider: 'google' | 'outlook' | 'internal';
  sync_status: 'pending' | 'synced' | 'error';
  last_synced?: string;
  task_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarSyncSettings {
  id: string;
  user_id: string;
  google_enabled: boolean;
  outlook_enabled: boolean;
  sync_direction: 'import_only' | 'export_only' | 'bidirectional';
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
  google_calendar_id?: string;
  outlook_calendar_id?: string;
  created_at: string;
  updated_at: string;
}

// Hook to fetch calendar events
export function useCalendarEvents(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['calendar-events', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('calendar_events')
        .select('*')
        .order('starts_at', { ascending: true });

      if (startDate) {
        query = query.gte('starts_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('starts_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching calendar events:', error);
        throw error;
      }

      return data as CalendarEvent[];
    },
    enabled: true
  });
}

// Hook to fetch calendar sync settings
export function useCalendarSyncSettings() {
  return useQuery({
    queryKey: ['calendar-sync-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_sync_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') { // Ignore not found error
        console.error('Error fetching sync settings:', error);
        throw error;
      }

      return data as CalendarSyncSettings | null;
    }
  });
}

// Hook to create calendar event
export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData: Partial<CalendarEvent> & { title: string; starts_at: string; ends_at: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          ...eventData,
          user_id: user?.id,
          provider: 'internal',
          sync_status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating calendar event:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('Event created successfully');
    },
    onError: (error) => {
      console.error('Failed to create calendar event:', error);
      toast.error('Failed to create event');
    }
  });
}

// Hook to update calendar event
export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CalendarEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from('calendar_events')
        .update({
          ...updates,
          sync_status: 'pending' // Mark for re-sync
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating calendar event:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('Event updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update calendar event:', error);
      toast.error('Failed to update event');
    }
  });
}

// Hook to delete calendar event
export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) {
        console.error('Error deleting calendar event:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('Event deleted successfully');
    },
    onError: (error) => {
      console.error('Failed to delete calendar event:', error);
      toast.error('Failed to delete event');
    }
  });
}

// Hook to update sync settings
export function useUpdateSyncSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<CalendarSyncSettings> & { user_id?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('calendar_sync_settings')
        .upsert({
          ...settings,
          user_id: settings.user_id || user?.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating sync settings:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-sync-settings'] });
      toast.success('Sync settings updated');
    },
    onError: (error) => {
      console.error('Failed to update sync settings:', error);
      toast.error('Failed to update sync settings');
    }
  });
}

// Hook to trigger manual sync
export function useManualSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('agenda-sync', {
        body: { manual: true }
      });

      if (error) {
        console.error('Error triggering manual sync:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Refresh calendar events after sync
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      }, 2000);
      toast.success('Calendar sync initiated');
    },
    onError: (error) => {
      console.error('Failed to trigger sync:', error);
      toast.error('Failed to sync calendar');
    }
  });
}