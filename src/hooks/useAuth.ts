
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
    console.log('useAuth - Initializing');
    
    const fetchUserProfile = async (user: User) => {
      try {
        console.log('useAuth - Fetching role for user:', user.id);
        const { data: role, error } = await supabase
          .rpc('get_current_user_role');
        
        if (error) {
          console.error('useAuth - Error fetching user role:', error);
          return { ...user, role: 'worker' };
        }
        
        console.log('useAuth - User role fetched:', role);
        return { ...user, role: role || 'worker' };
      } catch (error) {
        console.error('useAuth - Exception fetching user role:', error);
        return { ...user, role: 'worker' };
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('useAuth - Auth state changed:', event, !!session);
        setSession(session);
        
        if (session?.user) {
          // Defer Supabase calls to prevent deadlock
          setTimeout(async () => {
            const userWithRole = await fetchUserProfile(session.user);
            console.log('useAuth - Setting user with role:', userWithRole.role);
            setUser(userWithRole);
            setLoading(false);
          }, 0);
        } else {
          console.log('useAuth - No session, clearing user');
          setUser(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        console.log('useAuth - Checking for existing session');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('useAuth - Error getting session:', error);
          setLoading(false);
          return;
        }
        
        console.log('useAuth - Initial session check:', !!session);
        setSession(session);
        
        if (session?.user) {
          const userWithRole = await fetchUserProfile(session.user);
          console.log('useAuth - Initial user with role:', userWithRole.role);
          setUser(userWithRole);
        }
      } catch (error) {
        console.error('useAuth - Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      console.log('useAuth - Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    console.log('useAuth - Signing out');
    await supabase.auth.signOut();
  };

  console.log('useAuth - Current state:', { 
    hasUser: !!user, 
    userRole: user?.role, 
    hasSession: !!session, 
    loading 
  });

  return {
    user,
    session,
    loading,
    signOut,
    isAdmin: user?.role === 'admin'
  };
};
