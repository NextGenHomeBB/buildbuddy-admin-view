import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface EnhancedAuthState {
  isValid: boolean;
  role: string;
  userId: string | null;
  debugInfo?: any;
  isLoading: boolean;
}

export const useEnhancedAuth = () => {
  const [authState, setAuthState] = useState<EnhancedAuthState>({
    isValid: false,
    role: 'worker',
    userId: null,
    isLoading: true
  });

  const validateSession = async (operation?: string) => {
    try {
      console.log('Enhanced Auth - Validating session for operation:', operation);
      
      // Get current session to ensure we have a valid token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Enhanced Auth - Session retrieval error:', sessionError);
        throw sessionError;
      }

      if (!session?.access_token) {
        console.warn('Enhanced Auth - No valid session token found');
        throw new Error('No valid session token');
      }

      console.log('Enhanced Auth - Using session token:', session.access_token.substring(0, 20) + '...');
      
      const { data, error } = await supabase.functions.invoke('session-validate', {
        body: { operation: operation || 'general_access' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        console.error('Enhanced Auth - Validation error:', error);
        throw error;
      }

      console.log('Enhanced Auth - Validation result:', data);

      if (data.success) {
        setAuthState({
          isValid: true,
          role: data.role,
          userId: data.user_id,
          debugInfo: data.debug_info,
          isLoading: false
        });
        return data;
      } else {
        setAuthState({
          isValid: false,
          role: 'worker',
          userId: null,
          isLoading: false
        });
        
        if (data.action_required === 'login_required') {
          toast({
            title: "Session Expired",
            description: "Please log in again to continue.",
            variant: "destructive"
          });
          window.location.href = '/auth';
        }
        
        return null;
      }
    } catch (error) {
      console.error('Enhanced Auth - Session validation failed:', error);
      setAuthState({
        isValid: false,
        role: 'worker',
        userId: null,
        isLoading: false
      });
      return null;
    }
  };

  const debugAuthState = async () => {
    try {
      console.log('Enhanced Auth - Running auth debug...');
      
      // Get current session for debug
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('auth-debug', {
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`,
        } : undefined
      });

      if (error) {
        console.error('Enhanced Auth - Debug error:', error);
        throw error;
      }

      console.log('Enhanced Auth - Debug result:', data);
      
      toast({
        title: "Debug Information",
        description: `Session: ${data.session.session_valid ? 'Valid' : 'Invalid'}, Role: ${data.role_function.result?.role || 'Unknown'}`,
      });

      return data;
    } catch (error) {
      console.error('Enhanced Auth - Debug failed:', error);
      toast({
        title: "Debug Failed",
        description: "Could not retrieve authentication debug information.",
        variant: "destructive"
      });
      return null;
    }
  };

  const forceReauthentication = async () => {
    try {
      console.log('Enhanced Auth - Forcing reauthentication...');
      
      // Clean up current state
      const { cleanupAuthState, clearCachedUserState } = await import('@/utils/authCleanup');
      cleanupAuthState();
      clearCachedUserState();
      
      // Sign out and redirect
      await supabase.auth.signOut({ scope: 'global' });
      
      toast({
        title: "Reauthentication Required",
        description: "Please log in again to restore your session.",
      });
      
      window.location.href = '/auth';
    } catch (error) {
      console.error('Enhanced Auth - Force reauth failed:', error);
      // Fallback: still redirect
      window.location.href = '/auth';
    }
  };

  const initializeAuth = async () => {
    try {
      console.log('Enhanced Auth - Initializing authentication...');
      
      // Get current session first
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Enhanced Auth - Session initialization error:', error);
        setAuthState({
          isValid: false,
          role: 'worker',
          userId: null,
          isLoading: false
        });
        return;
      }

      if (session?.access_token) {
        console.log('Enhanced Auth - Found existing session, validating...');
        await validateSession();
      } else {
        console.log('Enhanced Auth - No existing session found');
        setAuthState({
          isValid: false,
          role: 'worker',
          userId: null,
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Enhanced Auth - Initialization failed:', error);
      setAuthState({
        isValid: false,
        role: 'worker',
        userId: null,
        isLoading: false
      });
    }
  };

  useEffect(() => {
    // Initialize authentication
    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Enhanced Auth - Auth state changed:', event, !!session);
        
        if (event === 'SIGNED_IN' && session) {
          // Validate the new session with a small delay
          setTimeout(() => {
            validateSession();
          }, 500);
        } else if (event === 'SIGNED_OUT') {
          setAuthState({
            isValid: false,
            role: 'worker',
            userId: null,
            isLoading: false
          });
        } else if (event === 'TOKEN_REFRESHED' && session) {
          console.log('Enhanced Auth - Token refreshed, revalidating...');
          setTimeout(() => {
            validateSession();
          }, 100);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    ...authState,
    validateSession,
    debugAuthState,
    forceReauthentication,
    isAdmin: authState.role === 'admin',
    hasPermission: (operation: string) => {
      const permissions = {
        assign_workers: authState.role === 'admin',
        manage_projects: authState.role === 'admin' || authState.role === 'manager',
        view_admin_panel: authState.role === 'admin',
        manage_users: authState.role === 'admin'
      };
      return permissions[operation as keyof typeof permissions] ?? false;
    }
  };
};