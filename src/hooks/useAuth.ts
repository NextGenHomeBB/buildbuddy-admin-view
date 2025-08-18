
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthUser extends User {
  role?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async (user: User) => {
      try {
        const { data: role, error } = await supabase
          .rpc('get_current_user_role');
        
        if (error) {
          return { ...user, role: 'worker' };
        }
        
        return { ...user, role: role || 'worker' };
      } catch (error) {
        return { ...user, role: 'worker' };
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Defer Supabase calls to prevent deadlock
          setTimeout(async () => {
            const userWithRole = await fetchUserProfile(session.user);
            setUser(userWithRole);
            setLoading(false);
          }, 0);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setLoading(false);
          return;
        }
        
        setSession(session);
        
        if (session?.user) {
          const userWithRole = await fetchUserProfile(session.user);
          setUser(userWithRole);
        }
      } catch (error) {
        // Silent error handling in production
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    user,
    session,
    loading,
    signOut,
    isAdmin: user?.role === 'admin'
  };
};
