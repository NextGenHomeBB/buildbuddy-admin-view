import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export interface ShiftSession {
  startTime: Date | null;
  project_id?: string;
  isActive: boolean;
  breakStartTime?: Date | null;
  breakDuration?: number; // Total break time in minutes
  location?: string;
  shiftType?: 'regular' | 'overtime' | 'weekend' | 'holiday';
}

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
}

export interface LiveEarnings {
  currentShiftEarnings: number;
  todayEarnings: number;
  weeklyEarnings: number;
  overtime: boolean;
}

export function useShiftTracker() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentShift, setCurrentShift] = useState<ShiftSession>({
    startTime: null,
    project_id: undefined,
    isActive: false,
    breakStartTime: null,
    breakDuration: 0,
    location: undefined,
    shiftType: 'regular'
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
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Get current worker rate for live earnings calculation
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
      hours: number;
      note: string;
      project_id?: string;
      break_duration?: number;
      shift_type?: string;
      location?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      logger.debug('Creating timesheet entry:', {
        user_id: user.id,
        project_id: data.project_id,
        work_date: new Date().toISOString().split('T')[0],
        hours: data.hours,
        note: data.note,
        break_duration: data.break_duration,
        shift_type: data.shift_type,
        location: data.location,
      });

      const { error } = await supabase
        .from('time_sheets')
        .insert({
          user_id: user.id,
          project_id: data.project_id || null,
          work_date: new Date().toISOString().split('T')[0],
          hours: data.hours,
          note: data.note,
          break_duration: data.break_duration || 0,
          shift_type: data.shift_type || 'regular',
          location: data.location,
        });

      if (error) {
        logger.error('Supabase error in shift tracker', error);
        throw new Error(`Failed to save timesheet: ${error.message}`);
      }
    },
    onSuccess: () => {
      logger.debug('Shift recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['today-shifts'] });
      toast.success('Shift recorded successfully');
    },
    onError: (error) => {
      // Error handling is done by react-query
      toast.error(`Failed to record shift: ${error.message}`);
    },
  });

  const startShift = (project_id?: string, shiftType: 'regular' | 'overtime' | 'weekend' | 'holiday' = 'regular') => {
    const startTime = new Date();
    const currentHour = startTime.getHours();
    const dayOfWeek = startTime.getDay();
    
    // Auto-detect shift type based on time and day
    let detectedShiftType = shiftType;
    if (dayOfWeek === 0 || dayOfWeek === 6) detectedShiftType = 'weekend';
    if (currentHour < 6 || currentHour > 18) detectedShiftType = 'overtime';
    
    const shift = {
      startTime,
      project_id,
      isActive: true,
      breakStartTime: null,
      breakDuration: 0,
      shiftType: detectedShiftType
    };
    
    setCurrentShift(shift);
    localStorage.setItem('activeShift', JSON.stringify(shift));
    toast.success(`${detectedShiftType.charAt(0).toUpperCase() + detectedShiftType.slice(1)} shift started`);
  };

  const startBreak = () => {
    if (!currentShift.isActive || currentShift.breakStartTime) return;
    
    const breakStartTime = new Date();
    const updatedShift = {
      ...currentShift,
      breakStartTime
    };
    
    setCurrentShift(updatedShift);
    localStorage.setItem('activeShift', JSON.stringify(updatedShift));
    toast.success('Break started');
  };

  const endBreak = () => {
    if (!currentShift.breakStartTime) return;
    
    const breakEndTime = new Date();
    const breakDurationMs = breakEndTime.getTime() - currentShift.breakStartTime.getTime();
    const breakDurationMinutes = breakDurationMs / (1000 * 60);
    
    const updatedShift = {
      ...currentShift,
      breakStartTime: null,
      breakDuration: (currentShift.breakDuration || 0) + breakDurationMinutes
    };
    
    setCurrentShift(updatedShift);
    localStorage.setItem('activeShift', JSON.stringify(updatedShift));
    toast.success('Break ended');
  };

  const endShift = () => {
    if (!currentShift.startTime) return;

    const endTime = new Date();
    const durationMs = endTime.getTime() - currentShift.startTime.getTime();
    const totalHours = durationMs / (1000 * 60 * 60); // Convert to hours
    
    // Subtract break time from total hours
    const breakHours = (currentShift.breakDuration || 0) / 60;
    const workHours = Math.max(0, totalHours - breakHours);

    const note = `${currentShift.shiftType} shift: ${currentShift.startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}${
      breakHours > 0 ? ` (${Math.round(currentShift.breakDuration || 0)}min break)` : ''
    }`;

    createTimesheetMutation.mutate({
      hours: workHours,
      note,
      project_id: currentShift.project_id,
      break_duration: currentShift.breakDuration,
      shift_type: currentShift.shiftType,
    });

    // Clear active shift
    setCurrentShift({
      startTime: null,
      project_id: undefined,
      isActive: false,
      breakStartTime: null,
      breakDuration: 0,
      shiftType: 'regular'
    });
    localStorage.removeItem('activeShift');
    toast.success('Shift ended and recorded');
  };

  // Calculate today's total hours
  const todayTotalHours = todayShifts.reduce((total, shift) => total + (shift.hours || 0), 0);

  // Calculate current shift duration (excluding breaks)
  const getCurrentShiftDuration = () => {
    if (!currentShift.startTime) return 0;
    const now = new Date();
    const durationMs = now.getTime() - currentShift.startTime.getTime();
    const totalHours = durationMs / (1000 * 60 * 60);
    const breakHours = (currentShift.breakDuration || 0) / 60;
    
    // If on break, add current break time
    if (currentShift.breakStartTime) {
      const currentBreakMs = now.getTime() - currentShift.breakStartTime.getTime();
      const currentBreakHours = currentBreakMs / (1000 * 60 * 60);
      return Math.max(0, totalHours - breakHours - currentBreakHours);
    }
    
    return Math.max(0, totalHours - breakHours);
  };

  // Calculate live earnings for current shift
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
      if (currentShift.shiftType === 'weekend') {
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
    } else if (currentRate.payment_type === 'salary') {
      const dailyRate = (currentRate.monthly_salary || 0) / 30;
      currentShiftEarnings = dailyRate * (currentHours / 8);
      todayEarnings = dailyRate;
    }

    return {
      currentShiftEarnings,
      todayEarnings,
      weeklyEarnings: todayEarnings * 5, // Rough estimate
      overtime: isOvertime
    };
  };

  const isOnBreak = !!currentShift.breakStartTime;

  return {
    currentShift,
    todayShifts,
    todayTotalHours,
    currentRate,
    isShiftActive: currentShift.isActive,
    isOnBreak,
    getCurrentShiftDuration,
    getLiveEarnings,
    startShift,
    endShift,
    startBreak,
    endBreak,
    isLoading: createTimesheetMutation.isPending,
  };
}