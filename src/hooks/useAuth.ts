import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useAuth() {
  return useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      if (!supabase) {
        // Return mock session when Supabase is not configured
        return {
          user: { id: 'mock-user', email: 'admin@example.com' },
          access_token: 'mock-token'
        };
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    }
  });
}

export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      if (!supabase) {
        // Return mock admin user when Supabase is not configured
        return {
          id: 'mock-user',
          email: 'admin@example.com',
          full_name: 'Admin User',
          role: 'admin' as const,
          status: 'active' as const,
          company_id: 'mock-company',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        };
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      return profile;
    }
  });
}