import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ShiftSession {
  startTime: Date | null;
  project_id?: string;
  isActive: boolean;
}

export interface TimeSheet {
  id: string;
  user_id: string;
  project_id: string | null;
  work_date: string;
  hours: number;
  note: string | null;
  created_at: string;
}

export function useShiftTracker() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentShift, setCurrentShift] = useState<ShiftSession>({
    startTime: null,
    project_id: undefined,
    isActive: false
  });

  // Load ongoing shift from localStorage on mount
  useEffect(() => {
    const savedShift = localStorage.getItem('activeShift');
    if (savedShift) {
      const shift = JSON.parse(savedShift);
      if (shift.startTime) {
        setCurrentShift({
          ...shift,
          startTime: new Date(shift.startTime),
          isActive: true
        });
      }
    }
  }, []);

  // Get today's timesheet entries
  const { data: todayShifts = [] } = useQuery({
    queryKey: ['today-shifts', user?.id],
    queryFn: async (): Promise<TimeSheet[]> => {
      if (!user?.id) return [];

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('time_sheets')
        .select('*')
        .eq('user_id', user.id)
        .eq('work_date', today)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Create timesheet entry mutation
  const createTimesheetMutation = useMutation({
    mutationFn: async (data: {
      hours: number;
      note: string;
      project_id?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      console.log('Creating timesheet entry:', {
        user_id: user.id,
        project_id: data.project_id,
        work_date: new Date().toISOString().split('T')[0],
        hours: data.hours,
        note: data.note,
      });

      const { error } = await supabase
        .from('time_sheets')
        .insert({
          user_id: user.id,
          project_id: data.project_id || null,
          work_date: new Date().toISOString().split('T')[0],
          hours: data.hours,
          note: data.note,
        });

      if (error) {
        console.error('Supabase error details:', error);
        throw new Error(`Failed to save timesheet: ${error.message}`);
      }
    },
    onSuccess: () => {
      console.log('Shift recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['today-shifts'] });
      toast.success('Shift recorded successfully');
    },
    onError: (error) => {
      console.error('Error creating timesheet:', error);
      toast.error(`Failed to record shift: ${error.message}`);
    },
  });

  const startShift = (project_id?: string) => {
    const startTime = new Date();
    const shift = {
      startTime,
      project_id,
      isActive: true
    };
    
    setCurrentShift(shift);
    localStorage.setItem('activeShift', JSON.stringify(shift));
    toast.success('Shift started');
  };

  const endShift = () => {
    if (!currentShift.startTime) return;

    const endTime = new Date();
    const durationMs = endTime.getTime() - currentShift.startTime.getTime();
    const hours = durationMs / (1000 * 60 * 60); // Convert to hours

    const note = `Shift: ${currentShift.startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`;

    createTimesheetMutation.mutate({
      hours,
      note,
      project_id: currentShift.project_id,
    });

    // Clear active shift
    setCurrentShift({
      startTime: null,
      project_id: undefined,
      isActive: false
    });
    localStorage.removeItem('activeShift');
    toast.success('Shift ended and recorded');
  };

  // Calculate today's total hours
  const todayTotalHours = todayShifts.reduce((total, shift) => total + (shift.hours || 0), 0);

  // Calculate current shift duration
  const getCurrentShiftDuration = () => {
    if (!currentShift.startTime) return 0;
    const now = new Date();
    const durationMs = now.getTime() - currentShift.startTime.getTime();
    return durationMs / (1000 * 60 * 60); // Hours
  };

  return {
    currentShift,
    todayShifts,
    todayTotalHours,
    isShiftActive: currentShift.isActive,
    getCurrentShiftDuration,
    startShift,
    endShift,
    isLoading: createTimesheetMutation.isPending,
  };
}