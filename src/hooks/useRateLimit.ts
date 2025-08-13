import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface RateLimitOptions {
  maxAttempts?: number;
  windowMinutes?: number;
}

export const useRateLimit = () => {
  const [isBlocked, setIsBlocked] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  const checkRateLimit = useCallback(async (
    operation: string,
    options: RateLimitOptions = {}
  ): Promise<boolean> => {
    const { maxAttempts = 5, windowMinutes = 15 } = options;

    try {
      // Use enhanced rate limiting function
      const { data, error } = await supabase.rpc('check_rate_limit_enhanced', {
        operation_name: operation,
        max_attempts: maxAttempts,
        window_minutes: windowMinutes
      });

      if (error) {
        logger.error('Rate limit check error', error);
        // Allow operation on error to avoid blocking legitimate users
        return true;
      }

      const allowed = data as boolean;
      setIsBlocked(!allowed);
      
      if (!allowed) {
        logger.warn('Rate limit exceeded', { 
          operation, 
          maxAttempts, 
          windowMinutes 
        });
        setAttemptsRemaining(0);
      } else {
        // Reset attempts remaining when allowed
        setAttemptsRemaining(null);
      }

      return allowed;
    } catch (error) {
      logger.error('Rate limit check failed', error);
      // Allow operation on error to avoid blocking legitimate users
      return true;
    }
  }, []);

  const resetRateLimit = useCallback(() => {
    setIsBlocked(false);
    setAttemptsRemaining(null);
  }, []);

  return {
    checkRateLimit,
    resetRateLimit,
    isBlocked,
    attemptsRemaining
  };
};