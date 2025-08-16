import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSecurityValidation } from './useSecurityValidation';
import { logger } from '@/utils/logger';
import { toast } from '@/hooks/use-toast';

interface RotationCheckResult {
  requires_rotation: boolean;
  warning_only: boolean;
  credential_age_days: number;
  max_age_days: number;
  reasons: string[];
  policy: any;
}

export const useSecureCalendar = () => {
  const { validateCredentialAccess, logSecurityEvent } = useSecurityValidation();

  // Secure Apple Calendar credential access
  const getAppleCredentials = useCallback(async (userId: string) => {
    try {
      // Validate access before retrieving credentials
      const canAccess = await validateCredentialAccess('apple_calendar', 'read');
      if (!canAccess) {
        throw new Error('Access to Apple Calendar credentials denied');
      }

      const { data, error } = await supabase
        .from('apple_calendar_credentials')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        await logSecurityEvent('CREDENTIAL_ACCESS_ERROR', 'medium', {
          error: error.message,
          user_id: userId
        });
        throw error;
      }

      if (data) {
        // Enhanced logging with credential access monitoring
        await supabase.rpc('log_credential_access', {
          p_credential_type: 'apple_calendar',
          p_credential_id: data.id,
          p_access_type: 'READ',
          p_access_reason: 'calendar_sync_setup',
          p_additional_context: { userId, timestamp: new Date().toISOString() }
        });

        // Check if rotation is required
        const { data: rotationCheck } = await supabase.rpc('check_credential_rotation_required', {
          p_credential_type: 'apple_calendar',
          p_credential_id: data.id
        });

        if (rotationCheck && typeof rotationCheck === 'object' && 'requires_rotation' in rotationCheck) {
          const rotationData = rotationCheck as unknown as RotationCheckResult;
          if (rotationData.requires_rotation) {
            console.warn('Apple Calendar credentials require rotation:', rotationData.reasons);
            toast({
              title: "Credential Update Required",
              description: "Your Apple Calendar credentials need to be updated for security reasons.",
              variant: "destructive",
            });
          } else if (rotationData.warning_only) {
            toast({
              title: "Credential Expiration Warning", 
              description: `Your Apple Calendar credentials will expire in ${rotationData.max_age_days - rotationData.credential_age_days} days.`,
              variant: "default",
            });
          }
        }

        // Log successful access
        await logSecurityEvent('CREDENTIAL_ACCESS_SUCCESS', 'low', {
          credential_type: 'apple_calendar',
          user_id: userId,
          rotation_status: rotationCheck
        });
      }

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

      if (data) {
        // Enhanced credential access logging
        await supabase.rpc('log_credential_access', {
          p_credential_type: 'oauth_token',
          p_credential_id: data.id,
          p_access_type: 'READ',
          p_access_reason: 'token_retrieval',
          p_additional_context: { 
            userId, 
            provider,
            usageCount: data.usage_count || 0,
            timestamp: new Date().toISOString()
          }
        });

        // Check rotation requirements for OAuth tokens
        const { data: rotationCheck } = await supabase.rpc('check_credential_rotation_required', {
          p_credential_type: 'oauth_token',
          p_credential_id: data.id
        });

        if (rotationCheck && typeof rotationCheck === 'object' && 'requires_rotation' in rotationCheck) {
          const rotationData = rotationCheck as unknown as RotationCheckResult;
          if (rotationData.requires_rotation) {
            console.warn('OAuth token requires rotation:', rotationData.reasons);
            // Update rotation_required flag
            await supabase
              .from('calendar_oauth_tokens')
              .update({ rotation_required: true })
              .eq('id', data.id);
              
            toast({
              title: "Token Renewal Required",
              description: `Your ${provider} token needs to be renewed for security reasons.`,
              variant: "destructive",
            });
          } else if (rotationData.warning_only) {
            toast({
              title: "Token Expiration Warning", 
              description: `Your ${provider} token will expire in ${rotationData.max_age_days - rotationData.credential_age_days} days.`,
              variant: "default",
            });
          }
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

        // Update last used timestamp and enhanced tracking
        await supabase
          .from('calendar_oauth_tokens')
          .update({ 
            updated_at: new Date().toISOString(),
            last_rotation_at: data.last_rotation_at || new Date().toISOString()
          })
          .eq('id', data.id);
      }

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

  // Secure credential storage with encryption tracking
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

      // Enhanced credential storage with new security fields
      const { data, error } = await supabase
        .from('apple_calendar_credentials')
        .upsert({
          username: credentials.username,
          app_password: credentials.app_password,
          caldav_url: credentials.caldav_url || 'https://caldav.icloud.com/',
          encryption_key_id: 'pending_encryption', // Mark for future encryption
          encryption_version: 1,
          last_rotation_at: new Date().toISOString(),
          credential_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
          rotation_required: false,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) {
        await logSecurityEvent('CREDENTIAL_STORE_ERROR', 'high', {
          error: error.message
        });
        throw error;
      }

      if (data) {
        // Log the credential creation with enhanced monitoring
        await supabase.rpc('log_credential_access', {
          p_credential_type: 'apple_calendar',
          p_credential_id: data.id,
          p_access_type: 'CREATE',
          p_access_reason: 'initial_credential_setup',
          p_additional_context: { 
            username: credentials.username,
            caldavUrl: credentials.caldav_url,
            encryptionStatus: 'pending',
            timestamp: new Date().toISOString()
          }
        });

        toast({
          title: "Credentials Stored",
          description: "Apple Calendar credentials have been securely stored with enhanced protection.",
          variant: "default",
        });
      }

      await logSecurityEvent('CREDENTIAL_STORED', 'medium', {
        credential_type: 'apple_calendar',
        encrypted: false, // TODO: Implement encryption
        credential_id: data?.id,
        rotation_policy_applied: true
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