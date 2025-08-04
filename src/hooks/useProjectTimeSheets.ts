import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { TimeSheet } from '@/components/admin/TimesheetCard';

interface CreateTimesheetData {
  project_id: string;
  work_date: string;
  hours: number;
  note?: string;
  location?: string;
  shift_type?: string;
  break_duration?: number;
}

interface UpdateTimesheetData {
  id: string;
  hours?: number;
  note?: string;
  location?: string;
}

export function useProjectTimeSheets(projectId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch timesheets for a specific project
  const {
    data: timesheets,
    isLoading,
    error
  } = useQuery({
    queryKey: ['project-timesheets', projectId, user?.id],
    queryFn: async (): Promise<TimeSheet[]> => {
      if (!user?.id || !projectId) return [];

      const { data, error } = await supabase
        .from('time_sheets')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .order('work_date', { ascending: false });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        sync_status: item.sync_status as 'pending' | 'synced' | 'failed' || 'pending'
      }));
    },
    enabled: !!user?.id && !!projectId,
  });

  // Create new timesheet entry
  const createTimesheetMutation = useMutation({
    mutationFn: async (data: CreateTimesheetData): Promise<TimeSheet> => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: timesheet, error } = await supabase
        .from('time_sheets')
        .insert({
          user_id: user.id,
          ...data
        })
        .select()
        .single();

      if (error) throw error;
      return {
        ...timesheet,
        sync_status: timesheet.sync_status as 'pending' | 'synced' | 'failed' || 'pending'
      };
    },
    onSuccess: (newTimesheet) => {
      // Optimistically update the cache
      queryClient.setQueryData(
        ['project-timesheets', projectId, user?.id],
        (old: TimeSheet[] = []) => [newTimesheet, ...old]
      );
      
      toast.success('Time entry created successfully');
    },
    onError: (error) => {
      console.error('Failed to create timesheet:', error);
      toast.error('Failed to create time entry');
    },
  });

  // Update existing timesheet
  const updateTimesheetMutation = useMutation({
    mutationFn: async (data: UpdateTimesheetData): Promise<TimeSheet> => {
      const { id, ...updateData } = data;
      
      const { data: timesheet, error } = await supabase
        .from('time_sheets')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return {
        ...timesheet,
        sync_status: timesheet.sync_status as 'pending' | 'synced' | 'failed' || 'pending'
      };
    },
    onSuccess: (updatedTimesheet) => {
      // Optimistically update the cache
      queryClient.setQueryData(
        ['project-timesheets', projectId, user?.id],
        (old: TimeSheet[] = []) =>
          old.map(sheet => 
            sheet.id === updatedTimesheet.id ? updatedTimesheet : sheet
          )
      );
      
      toast.success('Time entry updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update timesheet:', error);
      toast.error('Failed to update time entry');
    },
  });

  // Delete timesheet
  const deleteTimesheetMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('time_sheets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, deletedId) => {
      // Optimistically update the cache
      queryClient.setQueryData(
        ['project-timesheets', projectId, user?.id],
        (old: TimeSheet[] = []) =>
          old.filter(sheet => sheet.id !== deletedId)
      );
      
      toast.success('Time entry deleted successfully');
    },
    onError: (error) => {
      console.error('Failed to delete timesheet:', error);
      toast.error('Failed to delete time entry');
    },
  });

  // Sync timesheet to external system
  const syncTimesheetMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.functions.invoke('sync-timesheet', {
        body: { timesheet_id: id }
      });

      if (error) throw error;
    },
    onSuccess: () => {
      // Refresh the timesheets to get updated sync status
      queryClient.invalidateQueries({
        queryKey: ['project-timesheets', projectId, user?.id]
      });
      
      toast.success('Time entry synced successfully');
    },
    onError: (error) => {
      console.error('Failed to sync timesheet:', error);
      toast.error('Failed to sync time entry');
    },
  });

  // Calculate total hours for the project
  const totalHours = timesheets?.reduce((sum, sheet) => sum + sheet.hours, 0) || 0;

  // Get recent timesheets (last 7 days)
  const recentTimesheets = timesheets?.slice(0, 7) || [];

  return {
    timesheets: timesheets || [],
    totalHours,
    recentTimesheets,
    isLoading,
    error,
    createTimesheet: createTimesheetMutation.mutate,
    updateTimesheet: updateTimesheetMutation.mutate,
    deleteTimesheet: deleteTimesheetMutation.mutate,
    syncTimesheet: syncTimesheetMutation.mutate,
    isCreating: createTimesheetMutation.isPending,
    isUpdating: updateTimesheetMutation.isPending,
    isDeleting: deleteTimesheetMutation.isPending,
    isSyncing: syncTimesheetMutation.isPending,
  };
}