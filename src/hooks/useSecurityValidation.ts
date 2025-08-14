import { useCallback } from 'react';
import { useInputValidation } from './useInputValidation';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

export const useSecurityValidation = () => {
  const { validateEmail, validateText, sanitizeHtml } = useInputValidation();

  // Security monitoring function
  const logSecurityEvent = useCallback(async (eventType: string, severity: 'low' | 'medium' | 'high' = 'medium', details: any = {}) => {
    try {
      await supabase.rpc('log_security_event', {
        event_type: eventType,
        severity,
        details
      });
    } catch (error) {
      logger.error('Failed to log security event', { eventType, error });
    }
  }, []);

  // Enhanced credential validation
  const validateCredentialAccess = useCallback(async (credentialType: string, action: string) => {
    try {
      // Log credential access attempt
      await logSecurityEvent('CREDENTIAL_ACCESS_ATTEMPT', 'medium', {
        credential_type: credentialType,
        action,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      logger.error('Credential access validation failed', error);
      await logSecurityEvent('CREDENTIAL_ACCESS_FAILED', 'high', {
        credential_type: credentialType,
        action,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }, [logSecurityEvent]);

  // Enhanced validation for quotation data
  const validateQuotationData = useCallback((data: {
    client_name?: string;
    client_email?: string;
    client_address?: string;
    client_phone?: string;
    notes?: string;
    terms_conditions?: string;
  }) => {
    const errors: string[] = [];
    const sanitizedData: any = {};

    // Validate and sanitize client name
    if (data.client_name) {
      const nameValidation = validateText(data.client_name, {
        required: true,
        minLength: 2,
        maxLength: 100,
        fieldName: 'Client name'
      });
      if (!nameValidation.isValid) {
        errors.push(...nameValidation.errors);
      } else {
        sanitizedData.client_name = nameValidation.sanitizedValue;
      }
    }

    // Validate and sanitize client email
    if (data.client_email) {
      const emailValidation = validateEmail(data.client_email);
      if (!emailValidation.isValid) {
        errors.push(...emailValidation.errors);
      } else {
        sanitizedData.client_email = emailValidation.sanitizedValue;
      }
    }

    // Validate and sanitize other fields
    if (data.client_address) {
      const addressValidation = validateText(data.client_address, {
        maxLength: 500,
        fieldName: 'Client address'
      });
      if (!addressValidation.isValid) {
        errors.push(...addressValidation.errors);
      } else {
        sanitizedData.client_address = addressValidation.sanitizedValue;
      }
    }

    if (data.client_phone) {
      const phoneValidation = validateText(data.client_phone, {
        maxLength: 20,
        fieldName: 'Client phone'
      });
      if (!phoneValidation.isValid) {
        errors.push(...phoneValidation.errors);
      } else {
        sanitizedData.client_phone = phoneValidation.sanitizedValue;
      }
    }

    if (data.notes) {
      const notesValidation = validateText(data.notes, {
        maxLength: 2000,
        fieldName: 'Notes'
      });
      if (!notesValidation.isValid) {
        errors.push(...notesValidation.errors);
      } else {
        sanitizedData.notes = notesValidation.sanitizedValue;
      }
    }

    if (data.terms_conditions) {
      const termsValidation = validateText(data.terms_conditions, {
        maxLength: 5000,
        fieldName: 'Terms and conditions'
      });
      if (!termsValidation.isValid) {
        errors.push(...termsValidation.errors);
      } else {
        sanitizedData.terms_conditions = termsValidation.sanitizedValue;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData
    };
  }, [validateEmail, validateText]);

  // Validate material/line item data
  const validateLineItemData = useCallback((data: {
    material_name?: string;
    material_description?: string;
    material_sku?: string;
    quantity?: number;
    unit_price?: number;
  }) => {
    const errors: string[] = [];
    const sanitizedData: any = {};

    if (data.material_name) {
      const nameValidation = validateText(data.material_name, {
        required: true,
        minLength: 1,
        maxLength: 200,
        fieldName: 'Material name'
      });
      if (!nameValidation.isValid) {
        errors.push(...nameValidation.errors);
      } else {
        sanitizedData.material_name = nameValidation.sanitizedValue;
      }
    }

    if (data.material_description) {
      const descValidation = validateText(data.material_description, {
        maxLength: 1000,
        fieldName: 'Material description'
      });
      if (!descValidation.isValid) {
        errors.push(...descValidation.errors);
      } else {
        sanitizedData.material_description = descValidation.sanitizedValue;
      }
    }

    if (data.material_sku) {
      const skuValidation = validateText(data.material_sku, {
        maxLength: 50,
        allowSpecialChars: false,
        fieldName: 'Material SKU'
      });
      if (!skuValidation.isValid) {
        errors.push(...skuValidation.errors);
      } else {
        sanitizedData.material_sku = skuValidation.sanitizedValue;
      }
    }

    // Validate numeric fields
    if (data.quantity !== undefined) {
      if (typeof data.quantity !== 'number' || data.quantity < 0 || data.quantity > 1000000) {
        errors.push('Quantity must be a valid positive number');
      } else {
        sanitizedData.quantity = data.quantity;
      }
    }

    if (data.unit_price !== undefined) {
      if (typeof data.unit_price !== 'number' || data.unit_price < 0 || data.unit_price > 1000000) {
        errors.push('Unit price must be a valid positive number');
      } else {
        sanitizedData.unit_price = data.unit_price;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData
    };
  }, [validateText]);

  // Security check for organization access
  const validateOrganizationAccess = useCallback((orgId: string, userRole: string) => {
    if (!orgId || typeof orgId !== 'string') {
      logger.warn('Invalid organization ID provided', { orgId });
      return false;
    }

    if (!['admin', 'manager', 'worker'].includes(userRole)) {
      logger.warn('Invalid user role provided', { userRole });
      return false;
    }

    return true;
  }, []);

  // Handle security violations
  const handleSecurityViolation = useCallback((violation: string, details?: any) => {
    logger.error('Security violation detected', { violation, details });
    
    toast({
      title: "Security Error",
      description: "Invalid data detected. Please check your input and try again.",
      variant: "destructive",
    });
  }, []);

  return {
    validateQuotationData,
    validateLineItemData,
    validateOrganizationAccess,
    handleSecurityViolation,
    validateCredentialAccess,
    logSecurityEvent,
    sanitizeHtml
  };
};