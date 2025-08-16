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
      
      const { data, error } = await supabase.functions.invoke('session-validate', {
        body: { operation: operation || 'general_access' }
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
      
      const { data, error } = await supabase.functions.invoke('auth-debug');

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

  useEffect(() => {
    // Initial validation
    validateSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Enhanced Auth - Auth state changed:', event, !!session);
        
        if (event === 'SIGNED_IN' && session) {
          // Validate the new session
          setTimeout(() => {
            validateSession();
          }, 100);
        } else if (event === 'SIGNED_OUT') {
          setAuthState({
            isValid: false,
            role: 'worker',
            userId: null,
            isLoading: false
          });
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