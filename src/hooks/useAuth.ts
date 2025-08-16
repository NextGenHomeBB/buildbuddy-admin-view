
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
      (event, session) => {
        // Only synchronous state updates here to prevent deadlocks
        setSession(session);
        
        if (session?.user) {
          // Defer Supabase calls to prevent deadlock
          setTimeout(async () => {
            try {
              const userWithRole = await fetchUserProfile(session.user);
              setUser(userWithRole);
              setLoading(false);
            } catch (error) {
              console.error('Error fetching user profile:', error);
              setUser({ ...session.user, role: 'worker' });
              setLoading(false);
            }
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
    try {
      // Import cleanup utility
      const { cleanupAuthState, clearCachedUserState } = await import('@/utils/authCleanup');
      
      // Clean up auth state first
      cleanupAuthState();
      clearCachedUserState();
      
      // Attempt global sign out (fallback if it fails)
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
        console.warn('Global signout failed, continuing with cleanup');
      }
      
      // Force page reload for a clean state
      window.location.href = '/auth';
    } catch (error) {
      console.error('Sign out error:', error);
      // Fallback: still redirect to auth page
      window.location.href = '/auth';
    }
  };

  return {
    user,
    session,
    loading,
    signOut,
    isAdmin: user?.role === 'admin'
  };
};
