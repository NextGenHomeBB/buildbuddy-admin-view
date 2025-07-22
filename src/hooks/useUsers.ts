import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/admin';
import { useToast } from '@/hooks/use-toast';
import { mockUsers } from '@/lib/mockData';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      if (!supabase) {
        // Return mock data when Supabase is not configured
        return mockUsers;
      }
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as User[];
    }
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (user: Omit<User, 'id' | 'created_at' | 'updated_at' | 'last_login'>) => {
      if (!supabase) {
        // Mock success when Supabase is not configured
        return { ...user, id: Date.now().toString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      }
      
      const { data, error } = await supabase
        .from('users')
        .insert([user])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Success',
        description: 'User invited successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to invite user',
        variant: 'destructive',
      });
    }
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<User> & { id: string }) => {
      if (!supabase) {
        // Mock success when Supabase is not configured
        return { id, ...updates, updated_at: new Date().toISOString() };
      }
      
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update user',
        variant: 'destructive',
      });
    }
  });
}