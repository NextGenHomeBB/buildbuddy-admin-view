import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ShiftSession {
  startTime: string;
  projectId: string | null;
  breakStart: string | null;
  totalBreakTime: number;
  shiftType: 'regular' | 'overtime' | 'weekend' | 'holiday';
}

interface TimeSheet {
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
}

interface LiveEarnings {
  currentShiftEarnings: number;
  todayEarnings: number;
  weeklyEarnings: number;
  overtime: boolean;
}

export function useShiftTracker() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentShift, setCurrentShift] = useState<ShiftSession | null>(null);

  // Load ongoing shift and sync with database on mount
  useEffect(() => {
    const syncShiftWithDatabase = async () => {
      if (!user?.id) return;
      
      // Check if there's an active shift in the database
      const { data: activeShift } = await supabase
        .from('active_shifts')
        .select('*')
        .eq('worker_id', user.id)
        .single();

      if (activeShift) {
        // Database has active shift - sync localStorage
        const syncedShift: ShiftSession = {
          startTime: activeShift.shift_start,
          projectId: activeShift.project_id,
          breakStart: activeShift.break_start,
          totalBreakTime: activeShift.total_break_duration || 0,
          shiftType: (activeShift.shift_type as 'regular' | 'overtime') || 'regular'
        };
        setCurrentShift(syncedShift);
        localStorage.setItem('currentShift', JSON.stringify(syncedShift));
      } else {
        // No active shift in database - check localStorage
        const savedShift = localStorage.getItem('currentShift');
        if (savedShift) {
          try {
            const shift = JSON.parse(savedShift);
            // Verify this shift is still valid (not older than 24 hours)
            const shiftAge = Date.now() - new Date(shift.startTime).getTime();
            if (shiftAge > 24 * 60 * 60 * 1000) {
              // Shift is too old, remove it
              localStorage.removeItem('currentShift');
            } else {
              // Try to restore the shift in database
              const { error } = await supabase
                .from('active_shifts')
                .insert({
                  worker_id: user.id,
                  project_id: shift.projectId,
                  shift_start: shift.startTime,
                  shift_type: shift.shiftType,
                  break_start: shift.breakStart,
                  total_break_duration: shift.totalBreakTime || 0
                });
              
              if (!error) {
                setCurrentShift(shift);
              } else {
                console.error('Failed to sync shift to database:', error);
                localStorage.removeItem('currentShift');
              }
            }
          } catch (error) {
            console.error('Error parsing saved shift:', error);
            localStorage.removeItem('currentShift');
          }
        }
      }
    };

    syncShiftWithDatabase();
  }, [user?.id]);

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
    refetchInterval: 30000,
  });

  // Get current worker rate
  const { data: currentRate } = useQuery({
    queryKey: ['current-worker-rate', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('worker_rates')
        .select('*')
        .eq('worker_id', user.id)
        .lte('effective_date', today)
        .or('end_date.is.null,end_date.gte.' + today)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Create timesheet entry mutation
  const createTimesheetMutation = useMutation({
    mutationFn: async (data: {
      user_id: string;
      work_date: string;
      hours: number;
      break_duration: number;
      project_id?: string | null;
      shift_type?: string;
      note?: string | null;
      location?: string | null;
    }) => {
      const { error } = await supabase
        .from('time_sheets')
        .insert(data);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-shifts'] });
      toast.success('Shift recorded successfully');
    },
    onError: (error) => {
      toast.error(`Failed to record shift: ${error.message}`);
    },
  });

  const startShift = async (projectId?: string, shiftType: 'regular' | 'overtime' = 'regular') => {
    if (!currentRate || currentShift) return;

    const newShift: ShiftSession = {
      startTime: new Date().toISOString(),
      projectId: projectId || null,
      breakStart: null,
      totalBreakTime: 0,
      shiftType
    };

    // Insert into active_shifts table
    const { error } = await supabase
      .from('active_shifts')
      .insert({
        worker_id: user?.id,
        project_id: projectId || null,
        shift_start: newShift.startTime,
        shift_type: shiftType,
        total_break_duration: 0
      });

    if (error) {
      console.error('Error starting shift:', error);
      toast.error('Failed to start shift. Please try again.');
      return;
    }

    setCurrentShift(newShift);
    localStorage.setItem('currentShift', JSON.stringify(newShift));
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
  };

  const startBreak = async () => {
    if (!currentShift || currentShift.breakStart) return;
    
    const updatedShift = {
      ...currentShift,
      breakStart: new Date().toISOString()
    };

    // Update active_shifts table with break start
    const { error } = await supabase
      .from('active_shifts')
      .update({
        break_start: new Date().toISOString()
      })
      .eq('worker_id', user?.id);

    if (error) {
      console.error('Error starting break:', error);
      toast.error('Failed to start break. Please try again.');
      return;
    }
    
    setCurrentShift(updatedShift);
    localStorage.setItem('currentShift', JSON.stringify(updatedShift));
  };

  const endBreak = async () => {
    if (!currentShift || !currentShift.breakStart) return;
    
    const breakEndTime = new Date();
    const breakStartTime = new Date(currentShift.breakStart);
    const breakDuration = (breakEndTime.getTime() - breakStartTime.getTime()) / (1000 * 60); // in minutes
    
    const updatedShift = {
      ...currentShift,
      breakStart: null,
      totalBreakTime: currentShift.totalBreakTime + breakDuration
    };

    // Update active_shifts table with break end
    const { error } = await supabase
      .from('active_shifts')
      .update({
        break_start: null,
        total_break_duration: updatedShift.totalBreakTime
      })
      .eq('worker_id', user?.id);

    if (error) {
      console.error('Error ending break:', error);
      toast.error('Failed to end break. Please try again.');
      return;
    }
    
    setCurrentShift(updatedShift);
    localStorage.setItem('currentShift', JSON.stringify(updatedShift));
  };

  const endShift = async (notes?: string) => {
    if (!currentShift || !currentRate) return;

    const endTime = new Date();
    const startTime = new Date(currentShift.startTime);
    const totalDuration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // in hours
    const workingHours = Math.max(0, totalDuration - (currentShift.totalBreakTime / 60));

    const timeSheetData = {
      user_id: user?.id,
      work_date: new Date(currentShift.startTime).toISOString().split('T')[0],
      hours: Number(workingHours.toFixed(2)),
      break_duration: Number(currentShift.totalBreakTime.toFixed(0)),
      project_id: currentShift.projectId,
      shift_type: currentShift.shiftType,
      note: notes || null,
      location: null
    };

    // Create timesheet entry
    await createTimesheetMutation.mutateAsync(timeSheetData);
    
    // Remove from active_shifts table
    const { error } = await supabase
      .from('active_shifts')
      .delete()
      .eq('worker_id', user?.id);

    if (error) {
      console.error('Error ending shift:', error);
    }
    
    // Clear the current shift
    setCurrentShift(null);
    localStorage.removeItem('currentShift');
  };

  // Calculate today's total hours
  const todayTotalHours = todayShifts.reduce((total, shift) => total + (shift.hours || 0), 0);

  // Calculate current shift duration
  const getCurrentShiftDuration = () => {
    if (!currentShift) return 0;
    
    const now = new Date();
    const startTime = new Date(currentShift.startTime);
    const totalHours = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const breakHours = currentShift.totalBreakTime / 60;
    
    // If on break, add current break time
    if (currentShift.breakStart) {
      const currentBreakMs = now.getTime() - new Date(currentShift.breakStart).getTime();
      const currentBreakHours = currentBreakMs / (1000 * 60 * 60);
      return Math.max(0, totalHours - breakHours - currentBreakHours);
    }
    
    return Math.max(0, totalHours - breakHours);
  };

  // Calculate live earnings
  const getLiveEarnings = (): LiveEarnings => {
    const currentHours = getCurrentShiftDuration();
    const todayHours = todayTotalHours + currentHours;
    
    if (!currentRate) {
      return {
        currentShiftEarnings: 0,
        todayEarnings: 0,
        weeklyEarnings: 0,
        overtime: false
      };
    }

    const isOvertime = todayHours > 8;
    let currentShiftEarnings = 0;
    let todayEarnings = 0;

    if (currentRate.payment_type === 'hourly') {
      const rate = currentRate.hourly_rate || 0;
      const overtimeRate = rate * 1.5;
      
      // Current shift earnings
      if (currentShift?.shiftType === 'weekend') {
        currentShiftEarnings = currentHours * overtimeRate;
      } else if (isOvertime && currentHours > 0) {
        const regularHours = Math.max(0, 8 - (todayHours - currentHours));
        const overtimeHours = currentHours - regularHours;
        currentShiftEarnings = (regularHours * rate) + (overtimeHours * overtimeRate);
      } else {
        currentShiftEarnings = currentHours * rate;
      }
      
      // Today total earnings
      const regularHours = Math.min(todayHours, 8);
      const overtimeHours = Math.max(0, todayHours - 8);
      todayEarnings = (regularHours * rate) + (overtimeHours * overtimeRate);
    }

    return {
      currentShiftEarnings,
      todayEarnings,
      weeklyEarnings: todayEarnings * 5, // Rough estimate
      overtime: isOvertime
    };
  };

  return {
    currentShift,
    todayShifts,
    todayTotalHours,
    currentRate,
    isShiftActive: !!currentShift,
    isOnBreak: !!(currentShift?.breakStart),
    getCurrentShiftDuration,
    getLiveEarnings,
    startShift,
    endShift,
    startBreak,
    endBreak,
    isLoading: createTimesheetMutation.isPending,
  };
}