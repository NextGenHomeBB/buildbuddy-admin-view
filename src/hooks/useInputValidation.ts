import { useCallback } from 'react';
import { logger } from '@/utils/logger';

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue: string;
  errors: string[];
}

export const useInputValidation = () => {
  // XSS protection - sanitize HTML entities
  const sanitizeHtml = useCallback((input: string): string => {
    if (!input) return '';
    
    return input.replace(/[<>&"']/g, (char) => {
      const entities: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#x27;'
      };
      return entities[char];
    });
  }, []);

  // SQL injection protection - basic pattern detection
  const hasSqlInjectionPattern = useCallback((input: string): boolean => {
    const sqlPatterns = [
      /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/i,
      /(--|\/\*|\*\/|;)/,
      /(\bOR\b|\bAND\b)\s+[\w\s]*=[\w\s]*/i,
      /['"](\s*|\s*\w+\s*)(=|<|>|LIKE)/i
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  }, []);

  // Validate email format
  const validateEmail = useCallback((email: string): ValidationResult => {
    const errors: string[] = [];
    let sanitizedValue = sanitizeHtml(email.trim().toLowerCase());
    
    if (!sanitizedValue) {
      errors.push('Email is required');
    } else {
      const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
      if (!emailRegex.test(sanitizedValue)) {
        errors.push('Please enter a valid email address');
      }
      if (sanitizedValue.length > 254) {
        errors.push('Email address is too long');
      }
      if (hasSqlInjectionPattern(sanitizedValue)) {
        errors.push('Invalid characters detected in email');
        logger.warn('Potential SQL injection attempt in email', { email: sanitizedValue });
      }
    }
    
    return {
      isValid: errors.length === 0,
      sanitizedValue,
      errors
    };
  }, [sanitizeHtml, hasSqlInjectionPattern]);

  // Validate password
  const validatePassword = useCallback((password: string): ValidationResult => {
    const errors: string[] = [];
    const sanitizedValue = password; // Don't sanitize passwords as it might break them
    
    if (!sanitizedValue) {
      errors.push('Password is required');
    } else {
      if (sanitizedValue.length < 8) {
        errors.push('Password must be at least 8 characters long');
      }
      if (sanitizedValue.length > 128) {
        errors.push('Password is too long');
      }
      // Check for basic complexity
      const hasLetter = /[a-zA-Z]/.test(sanitizedValue);
      const hasNumber = /\d/.test(sanitizedValue);
      if (!hasLetter || !hasNumber) {
        errors.push('Password must contain at least one letter and one number');
      }
    }
    
    return {
      isValid: errors.length === 0,
      sanitizedValue,
      errors
    };
  }, []);

  // Validate text input (names, descriptions, etc.)
  const validateText = useCallback((
    text: string, 
    options: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      allowSpecialChars?: boolean;
      fieldName?: string;
    } = {}
  ): ValidationResult => {
    const {
      required = false,
      minLength = 0,
      maxLength = 1000,
      allowSpecialChars = true,
      fieldName = 'Field'
    } = options;

    const errors: string[] = [];
    let sanitizedValue = sanitizeHtml(text.trim());
    
    if (required && !sanitizedValue) {
      errors.push(`${fieldName} is required`);
    }
    
    if (sanitizedValue) {
      if (sanitizedValue.length < minLength) {
        errors.push(`${fieldName} must be at least ${minLength} characters long`);
      }
      if (sanitizedValue.length > maxLength) {
        errors.push(`${fieldName} must be no more than ${maxLength} characters long`);
      }
      
      if (!allowSpecialChars) {
        const alphanumericRegex = /^[a-zA-Z0-9\s]*$/;
        if (!alphanumericRegex.test(sanitizedValue)) {
          errors.push(`${fieldName} can only contain letters, numbers, and spaces`);
        }
      }
      
      if (hasSqlInjectionPattern(sanitizedValue)) {
        errors.push(`Invalid characters detected in ${fieldName.toLowerCase()}`);
        logger.warn('Potential SQL injection attempt', { field: fieldName, value: sanitizedValue });
      }
    }
    
    return {
      isValid: errors.length === 0,
      sanitizedValue,
      errors
    };
  }, [sanitizeHtml, hasSqlInjectionPattern]);

  // Validate URL
  const validateUrl = useCallback((url: string, required = false): ValidationResult => {
    const errors: string[] = [];
    let sanitizedValue = sanitizeHtml(url.trim());
    
    if (required && !sanitizedValue) {
      errors.push('URL is required');
    }
    
    if (sanitizedValue) {
      try {
        new URL(sanitizedValue);
        // Only allow http and https protocols
        if (!sanitizedValue.startsWith('http://') && !sanitizedValue.startsWith('https://')) {
          errors.push('URL must start with http:// or https://');
        }
      } catch {
        errors.push('Please enter a valid URL');
      }
      
      if (hasSqlInjectionPattern(sanitizedValue)) {
        errors.push('Invalid characters detected in URL');
        logger.warn('Potential SQL injection attempt in URL', { url: sanitizedValue });
      }
    }
    
    return {
      isValid: errors.length === 0,
      sanitizedValue,
      errors
    };
  }, [sanitizeHtml, hasSqlInjectionPattern]);

  // Validate numeric input
  const validateNumber = useCallback((
    value: string,
    options: {
      required?: boolean;
      min?: number;
      max?: number;
      isInteger?: boolean;
      fieldName?: string;
    } = {}
  ): ValidationResult => {
    const {
      required = false,
      min,
      max,
      isInteger = false,
      fieldName = 'Number'
    } = options;

    const errors: string[] = [];
    const sanitizedValue = sanitizeHtml(value.trim());
    
    if (required && !sanitizedValue) {
      errors.push(`${fieldName} is required`);
    }
    
    if (sanitizedValue) {
      const numValue = parseFloat(sanitizedValue);
      
      if (isNaN(numValue)) {
        errors.push(`${fieldName} must be a valid number`);
      } else {
        if (isInteger && !Number.isInteger(numValue)) {
          errors.push(`${fieldName} must be a whole number`);
        }
        if (min !== undefined && numValue < min) {
          errors.push(`${fieldName} must be at least ${min}`);
        }
        if (max !== undefined && numValue > max) {
          errors.push(`${fieldName} must be no more than ${max}`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      sanitizedValue,
      errors
    };
  }, [sanitizeHtml]);

  return {
    validateEmail,
    validatePassword,
    validateText,
    validateUrl,
    validateNumber,
    sanitizeHtml
  };
};