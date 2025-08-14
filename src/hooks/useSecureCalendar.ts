import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSecurityValidation } from './useSecurityValidation';
import { logger } from '@/utils/logger';
import { toast } from '@/hooks/use-toast';

export const useSecureCalendar = () => {
  const { validateCredentialAccess, logSecurityEvent } = useSecurityValidation();

  // Secure Apple Calendar credential access using secure RPC function
  const getAppleCredentials = useCallback(async (userId?: string) => {
    try {
      // Use secure RPC function that handles all validation and logging internally
      const { data, error } = await supabase
        .rpc('get_apple_credentials_secure', { 
          p_user_id: userId || undefined 
        });

      if (error) {
        logger.error('Failed to get Apple credentials securely', error);
        throw error;
      }

      return data?.[0] || null; // Return first result or null
    } catch (error) {
      logger.error('Failed to get Apple credentials', error);
      throw error;
    }
  }, []);

  // Secure OAuth token access with usage monitoring
  const getOAuthToken = useCallback(async (userId: string, provider: string) => {
    try {
      // Validate access
      const canAccess = await validateCredentialAccess('oauth_token', 'read');
      if (!canAccess) {
        throw new Error('Access to OAuth tokens denied');
      }

      // Get token and update usage tracking
      const { data, error } = await supabase
        .from('calendar_oauth_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', provider)
        .single();

      if (error) {
        await logSecurityEvent('TOKEN_ACCESS_ERROR', 'medium', {
          error: error.message,
          provider,
          user_id: userId
        });
        throw error;
      }

      // Check for suspicious activity
      if (data.suspicious_activity) {
        await logSecurityEvent('SUSPICIOUS_TOKEN_DETECTED', 'high', {
          token_id: data.id,
          provider,
          user_id: userId
        });
        
        toast({
          title: "Security Alert",
          description: "Suspicious activity detected on your calendar token. Please review your account.",
          variant: "destructive",
        });
      }

      // Update last used timestamp (triggers monitoring)
      await supabase
        .from('calendar_oauth_tokens')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', data.id);

      return data;
    } catch (error) {
      logger.error('Failed to get OAuth token', error);
      await logSecurityEvent('TOKEN_ACCESS_FAILED', 'high', {
        error: error instanceof Error ? error.message : 'Unknown error',
        provider,
        user_id: userId
      });
      throw error;
    }
  }, [validateCredentialAccess, logSecurityEvent]);

  // Secure credential storage using secure RPC function
  const storeAppleCredentials = useCallback(async (credentials: {
    username: string;
    app_password: string;
    caldav_url?: string;
  }) => {
    try {
      // Use secure RPC function that handles all validation, rate limiting, and logging
      const { data, error } = await supabase
        .rpc('store_apple_credentials_secure', {
          p_username: credentials.username,
          p_app_password: credentials.app_password,
          p_caldav_url: credentials.caldav_url || 'https://caldav.icloud.com/'
        });

      if (error) {
        logger.error('Failed to store Apple credentials securely', error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Failed to store Apple credentials', error);
      throw error;
    }
  }, []);

  return {
    getAppleCredentials,
    getOAuthToken,
    storeAppleCredentials
  };
};