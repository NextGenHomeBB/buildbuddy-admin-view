import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSecurityValidation } from './useSecurityValidation';
import { logger } from '@/utils/logger';
import { toast } from '@/hooks/use-toast';

export const useSecureCalendar = () => {
  const { validateCredentialAccess, logSecurityEvent } = useSecurityValidation();

  // Secure Apple Calendar credential access using new secure function
  const getAppleCredentials = useCallback(async (userId: string) => {
    try {
      // Validate access before retrieving credentials
      const canAccess = await validateCredentialAccess('apple_calendar', 'read');
      if (!canAccess) {
        throw new Error('Access to Apple Calendar credentials denied');
      }

      const { data, error } = await supabase
        .rpc('get_apple_credentials_secure', { p_user_id: userId });

      if (error) {
        await logSecurityEvent('CREDENTIAL_ACCESS_ERROR', 'medium', {
          error: error.message,
          user_id: userId
        });
        throw error;
      }

      // Log successful access
      await logSecurityEvent('CREDENTIAL_ACCESS_SUCCESS', 'low', {
        credential_type: 'apple_calendar',
        user_id: userId
      });

      return data;
    } catch (error) {
      logger.error('Failed to get Apple credentials', error);
      await logSecurityEvent('CREDENTIAL_ACCESS_FAILED', 'high', {
        error: error instanceof Error ? error.message : 'Unknown error',
        user_id: userId
      });
      throw error;
    }
  }, [validateCredentialAccess, logSecurityEvent]);

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

  // Secure credential storage using new secure function
  const storeAppleCredentials = useCallback(async (credentials: {
    username: string;
    app_password: string;
    caldav_url?: string;
  }) => {
    try {
      const canAccess = await validateCredentialAccess('apple_calendar', 'write');
      if (!canAccess) {
        throw new Error('Cannot store Apple Calendar credentials');
      }

      const { data, error } = await supabase
        .rpc('store_apple_credentials_secure', {
          p_username: credentials.username,
          p_app_password: credentials.app_password,
          p_caldav_url: credentials.caldav_url || 'https://caldav.icloud.com/'
        });

      if (error) {
        await logSecurityEvent('CREDENTIAL_STORE_ERROR', 'high', {
          error: error.message
        });
        throw error;
      }

      await logSecurityEvent('CREDENTIAL_STORED', 'medium', {
        credential_type: 'apple_calendar',
        encrypted: false // TODO: Implement encryption
      });

      return data;
    } catch (error) {
      logger.error('Failed to store Apple credentials', error);
      await logSecurityEvent('CREDENTIAL_STORE_FAILED', 'high', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }, [validateCredentialAccess, logSecurityEvent]);

  return {
    getAppleCredentials,
    getOAuthToken,
    storeAppleCredentials
  };
};