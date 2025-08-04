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
      if (!user?.id) {
        console.log('📋 No user ID for shift sync');
        return;
      }
      
      console.log('🔄 Syncing shift with database for user:', user.id);
      
      // Check if there's an active shift in the database
      const { data: activeShift, error } = await supabase
        .from('active_shifts')
        .select('*')
        .eq('worker_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error checking active shifts:', error);
        return;
      }

      console.log('📊 Database active shift:', activeShift);

      if (activeShift) {
        // Database has active shift - sync localStorage
        console.log('✅ Found active shift in database, syncing to localStorage');
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
        console.log('📋 Checking localStorage shift:', savedShift);
        
        if (savedShift) {
          try {
            const shift = JSON.parse(savedShift);
            // Verify this shift is still valid (not older than 24 hours)
            const shiftAge = Date.now() - new Date(shift.startTime).getTime();
            if (shiftAge > 24 * 60 * 60 * 1000) {
              // Shift is too old, remove it
              console.log('🗑️ Removing stale shift from localStorage (>24h old)');
              localStorage.removeItem('currentShift');
            } else {
              // Try to restore the shift in database
              console.log('🔄 Attempting to restore shift to database');
              const { error: restoreError } = await supabase
                .from('active_shifts')
                .insert({
                  worker_id: user.id,
                  project_id: shift.projectId,
                  shift_start: shift.startTime,
                  shift_type: shift.shiftType,
                  break_start: shift.breakStart,
                  total_break_duration: shift.totalBreakTime || 0
                });
              
              if (!restoreError) {
                console.log('✅ Successfully restored shift to database');
                setCurrentShift(shift);
              } else {
                console.error('❌ Failed to restore shift to database:', restoreError);
                localStorage.removeItem('currentShift');
              }
            }
          } catch (error) {
            console.error('❌ Error parsing saved shift:', error);
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
    console.log('🚀 Starting shift:', { user: user?.id, projectId, shiftType, currentRate });
    
    if (!user?.id) {
      console.error('❌ No user ID available');
      toast.error('Please log in to start a shift');
      return;
    }

    if (!currentRate) {
      console.error('❌ No current rate available');
      toast.error('No wage rate configured. Please contact admin.');
      return;
    }

    if (currentShift) {
      console.error('❌ Shift already active');
      toast.error('Shift already active');
      return;
    }

    const newShift: ShiftSession = {
      startTime: new Date().toISOString(),
      projectId: projectId || null,
      breakStart: null,
      totalBreakTime: 0,
      shiftType
    };

    console.log('📊 Inserting shift to database:', {
      worker_id: user.id,
      project_id: projectId || null,
      shift_start: newShift.startTime,
      shift_type: shiftType,
      total_break_duration: 0
    });

    // Insert into active_shifts table
    const { error, data } = await supabase
      .from('active_shifts')
      .insert({
        worker_id: user.id,
        project_id: projectId || null,
        shift_start: newShift.startTime,
        shift_type: shiftType,
        total_break_duration: 0
      })
      .select();

    if (error) {
      console.error('❌ Database insert error:', error);
      toast.error(`Failed to start shift: ${error.message}`);
      return;
    }

    console.log('✅ Shift inserted successfully:', data);
    setCurrentShift(newShift);
    localStorage.setItem('currentShift', JSON.stringify(newShift));
    toast.success('Shift started successfully');
    
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
    
    // Data validation - check for impossible durations
    const totalDurationMs = endTime.getTime() - startTime.getTime();
    if (totalDurationMs < 0) {
      console.error('❌ Invalid shift duration: end time before start time');
      toast.error('Invalid shift times detected. Please contact support.');
      return;
    }
    
    if (totalDurationMs > 24 * 60 * 60 * 1000) { // More than 24 hours
      console.error('❌ Shift duration exceeds 24 hours:', totalDurationMs / (1000 * 60 * 60));
      toast.error('Shift duration cannot exceed 24 hours. Please contact support.');
      return;
    }
    
    const totalDuration = totalDurationMs / (1000 * 60 * 60); // in hours
    const workingHours = Math.max(0, totalDuration - (currentShift.totalBreakTime / 60));
    
    console.log('📊 Shift calculation:', {
      startTime: currentShift.startTime,
      endTime: endTime.toISOString(),
      totalDuration,
      breakTime: currentShift.totalBreakTime,
      workingHours
    });

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

  // Calculate current shift duration with validation
  const getCurrentShiftDuration = () => {
    if (!currentShift) return 0;
    
    const now = new Date();
    const startTime = new Date(currentShift.startTime);
    
    // Validate start time
    if (isNaN(startTime.getTime())) {
      console.error('❌ Invalid shift start time:', currentShift.startTime);
      return 0;
    }
    
    const totalMs = now.getTime() - startTime.getTime();
    
    // Prevent negative or impossible durations
    if (totalMs < 0) {
      console.error('❌ Negative shift duration detected');
      return 0;
    }
    
    if (totalMs > 24 * 60 * 60 * 1000) { // More than 24 hours
      console.error('❌ Shift duration exceeds 24 hours, possible stale data');
      return 0;
    }
    
    const totalHours = totalMs / (1000 * 60 * 60);
    const breakHours = (currentShift.totalBreakTime || 0) / 60;
    
    // If on break, add current break time
    if (currentShift.breakStart) {
      const breakStart = new Date(currentShift.breakStart);
      if (!isNaN(breakStart.getTime())) {
        const currentBreakMs = Math.max(0, now.getTime() - breakStart.getTime());
        const currentBreakHours = currentBreakMs / (1000 * 60 * 60);
        return Math.max(0, totalHours - breakHours - currentBreakHours);
      }
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

  const forceSyncShift = async () => {
    if (!currentShift || !user?.id) return false;
    
    console.log('🔄 Force syncing current shift to database...');
    
    const { error } = await supabase
      .from('active_shifts')
      .insert({
        worker_id: user.id,
        project_id: currentShift.projectId,
        shift_start: currentShift.startTime,
        shift_type: currentShift.shiftType,
        break_start: currentShift.breakStart,
        total_break_duration: currentShift.totalBreakTime || 0
      });
    
    if (error) {
      console.error('❌ Failed to force sync shift:', error);
      toast.error(`Failed to sync shift: ${error.message}`);
      return false;
    }
    
    console.log('✅ Successfully force synced shift to database');
    toast.success('Shift synced to database');
    return true;
  };

  // Clear stale shift data
  const clearStaleShift = async () => {
    console.log('🗑️ Clearing stale shift data...');
    setCurrentShift(null);
    localStorage.removeItem('currentShift');
    
    if (user?.id) {
      await supabase
        .from('active_shifts')
        .delete()
        .eq('worker_id', user.id);
    }
    
    toast.success('Shift data cleared');
    return true;
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
    forceSyncShift,
    clearStaleShift,
    isLoading: createTimesheetMutation.isPending,
  };
}