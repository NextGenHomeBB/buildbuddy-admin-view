
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
    let isMounted = true;
    
    const fetchUserProfile = async (user: User) => {
      try {
        const { data: role, error } = await supabase
          .rpc('get_current_user_role');
        
        if (error) {
          console.warn('Failed to fetch user role:', error);
          return { ...user, role: 'worker' };
        }
        
        return { ...user, role: role || 'worker' };
      } catch (error) {
        console.warn('Error fetching user role:', error);
        return { ...user, role: 'worker' };
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        console.log('Auth state change:', event, !!session);
        setSession(session);
        
        if (session?.user) {
          // Fetch user role asynchronously but don't block
          fetchUserProfile(session.user).then(userWithRole => {
            if (isMounted) {
              setUser(userWithRole);
              setLoading(false);
            }
          }).catch(error => {
            console.error('Error setting user profile:', error);
            if (isMounted) {
              setUser({ ...session.user, role: 'worker' });
              setLoading(false);
            }
          });
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
          console.error('Error getting session:', error);
          if (isMounted) setLoading(false);
          return;
        }
        
        if (!isMounted) return;
        
        setSession(session);
        
        if (session?.user) {
          const userWithRole = await fetchUserProfile(session.user);
          if (isMounted) {
            setUser(userWithRole);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
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
