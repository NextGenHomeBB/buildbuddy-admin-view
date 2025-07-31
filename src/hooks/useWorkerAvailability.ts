import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkerAvailability {
  id: string;
  worker_id: string;
  day_of_week: number;
  is_available: boolean;
  start_time?: string;
  end_time?: string;
  max_hours?: number;
  created_at: string;
  updated_at: string;
}

export interface WorkerDateAvailability {
  id: string;
  worker_id: string;
  date: string;
  is_available: boolean;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkerWithAvailability {
  id: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  weekly_availability: WorkerAvailability[];
  date_overrides: WorkerDateAvailability[];
  available_days_count: number;
  total_weekly_hours?: number;
}

export function useWorkerAvailability() {
  return useQuery({
    queryKey: ['worker-availability'],
    queryFn: async (): Promise<WorkerWithAvailability[]> => {
      // Get all workers with their profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name', { ascending: true });

      if (profilesError) {
        throw profilesError;
      }

      // Get weekly availability for all workers
      const { data: weeklyAvailability, error: weeklyError } = await supabase
        .from('worker_availability')
        .select('*')
        .order('worker_id, day_of_week');

      if (weeklyError) {
        throw weeklyError;
      }

      // Get date overrides for all workers (last 30 days and next 90 days)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 90);

      const { data: dateOverrides, error: dateError } = await supabase
        .from('worker_date_availability')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('worker_id, date');

      if (dateError) {
        throw dateError;
      }

      // Get user roles for workers
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        throw rolesError;
      }

      // Combine data for each worker
      return (profiles || []).map(profile => {
        const workerWeekly = (weeklyAvailability || []).filter(wa => wa.worker_id === profile.id);
        const workerOverrides = (dateOverrides || []).filter(da => da.worker_id === profile.id);
        const workerRole = userRoles?.find(ur => ur.user_id === profile.id);
        
        // Calculate available days count
        const availableDaysCount = workerWeekly.filter(wa => wa.is_available).length;
        
        // Calculate total weekly hours
        const totalWeeklyHours = workerWeekly
          .filter(wa => wa.is_available && wa.start_time && wa.end_time && wa.max_hours)
          .reduce((total, wa) => total + (wa.max_hours || 0), 0);

        return {
          id: profile.id,
          full_name: profile.full_name || 'Unknown Worker',
          avatar_url: profile.avatar_url,
          role: workerRole?.role || 'worker',
          weekly_availability: workerWeekly,
          date_overrides: workerOverrides,
          available_days_count: availableDaysCount,
          total_weekly_hours: totalWeeklyHours
        };
      });
    },
  });
}

export function useUpdateWorkerAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      workerId, 
      availability 
    }: { 
      workerId: string; 
      availability: Partial<WorkerAvailability>[] 
    }) => {
      // Update worker availability
      const updates = availability.map(async (item) => {
        if (item.id) {
          // Update existing - remove readonly fields
          const { id, worker_id, created_at, ...updateData } = item;
          return supabase
            .from('worker_availability')
            .update(updateData)
            .eq('id', item.id);
        } else {
          // Insert new - ensure required fields
          const insertData = {
            worker_id: workerId,
            day_of_week: item.day_of_week!,
            is_available: item.is_available ?? false,
            start_time: item.start_time,
            end_time: item.end_time,
            max_hours: item.max_hours,
          };
          return supabase
            .from('worker_availability')
            .insert(insertData);
        }
      });

      const results = await Promise.all(updates);
      const errors = results.filter(result => result.error);
      
      if (errors.length > 0) {
        throw new Error(`Failed to update availability: ${errors[0].error?.message}`);
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-availability'] });
    },
  });
}

export function useUpdateWorkerDateAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      workerId, 
      dateAvailability 
    }: { 
      workerId: string; 
      dateAvailability: Partial<WorkerDateAvailability>[] 
    }) => {
      // Update worker date availability
      const updates = dateAvailability.map(async (item) => {
        if (item.id) {
          // Update existing - remove readonly fields
          const { id, worker_id, created_at, ...updateData } = item;
          return supabase
            .from('worker_date_availability')
            .update(updateData)
            .eq('id', item.id);
        } else {
          // Insert new - ensure required fields
          const insertData = {
            worker_id: workerId,
            date: item.date!,
            is_available: item.is_available ?? false,
            note: item.note,
          };
          return supabase
            .from('worker_date_availability')
            .insert(insertData);
        }
      });

      const results = await Promise.all(updates);
      const errors = results.filter(result => result.error);
      
      if (errors.length > 0) {
        throw new Error(`Failed to update date availability: ${errors[0].error?.message}`);
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-availability'] });
    },
  });
}