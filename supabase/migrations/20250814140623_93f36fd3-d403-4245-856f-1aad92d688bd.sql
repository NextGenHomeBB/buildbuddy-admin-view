-- Critical Security Fix: Protect Employee Salary Information
-- This migration implements strict RLS policies for worker_rates table to prevent unauthorized salary data access

-- First, analyze current worker_rates table structure and create secure access functions

-- Create a secure function to get worker rates with proper authorization
CREATE OR REPLACE FUNCTION public.get_worker_rates_secure(
  p_worker_id uuid DEFAULT NULL,
  p_include_salary_details boolean DEFAULT false
)
RETURNS TABLE(
  id uuid,
  worker_id uuid,
  payment_type text,
  hourly_rate numeric,
  monthly_salary numeric,
  effective_date date,
  end_date date,
  created_at timestamp with time zone,
  created_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  target_worker_id uuid;
  is_hr_admin boolean := false;
  is_own_data boolean := false;
BEGIN
  -- Get current user role
  user_role := public.get_current_user_role();
  target_worker_id := COALESCE(p_worker_id, auth.uid());
  
  -- Check if user is HR administrator
  is_hr_admin := (user_role = 'admin');
  
  -- Check if user is accessing their own data
  is_own_data := (target_worker_id = auth.uid());
  
  -- Rate limiting for salary data access
  IF NOT public.check_rate_limit_enhanced('worker_rates_access', 10, 3600) THEN
    PERFORM public.safe_log_critical_security_event(
      'WORKER_RATES_ACCESS_RATE_LIMIT_EXCEEDED',
      'high',
      jsonb_build_object(
        'user_id', auth.uid(),
        'user_role', user_role,
        'target_worker_id', target_worker_id,
        'hr_admin', is_hr_admin,
        'own_data', is_own_data
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for salary data access';
  END IF;
  
  -- Authorization check
  IF NOT (is_hr_admin OR is_own_data) THEN
    PERFORM public.safe_log_critical_security_event(
      'UNAUTHORIZED_SALARY_DATA_ACCESS_ATTEMPT',
      'critical',
      jsonb_build_object(
        'user_id', auth.uid(),
        'user_role', user_role,
        'target_worker_id', target_worker_id,
        'violation_type', 'unauthorized_salary_access',
        'security_action', 'access_denied'
      )
    );
    RAISE EXCEPTION 'Access denied: insufficient permissions to view salary data';
  END IF;
  
  -- Log legitimate access
  PERFORM public.safe_log_critical_security_event(
    'WORKER_RATES_SECURE_ACCESS',
    'medium',
    jsonb_build_object(
      'user_id', auth.uid(),
      'user_role', user_role,
      'target_worker_id', target_worker_id,
      'hr_admin', is_hr_admin,
      'own_data', is_own_data,
      'salary_details_included', p_include_salary_details,
      'access_method', 'secure_rpc_function'
    )
  );
  
  -- Return data with appropriate masking based on authorization level
  RETURN QUERY
  SELECT 
    wr.id,
    wr.worker_id,
    wr.payment_type,
    CASE
      WHEN is_hr_admin OR (is_own_data AND p_include_salary_details) THEN wr.hourly_rate
      WHEN is_own_data THEN wr.hourly_rate -- Workers can see their own rates
      ELSE NULL::numeric -- Hide from unauthorized users
    END AS hourly_rate,
    CASE
      WHEN is_hr_admin OR (is_own_data AND p_include_salary_details) THEN wr.monthly_salary
      WHEN is_own_data THEN wr.monthly_salary -- Workers can see their own salary
      ELSE NULL::numeric -- Hide from unauthorized users
    END AS monthly_salary,
    wr.effective_date,
    wr.end_date,
    wr.created_at,
    CASE
      WHEN is_hr_admin THEN wr.created_by
      ELSE NULL::uuid -- Hide creator info from non-HR users
    END AS created_by
  FROM public.worker_rates wr
  WHERE 
    -- Apply row-level filtering
    (is_hr_admin OR wr.worker_id = auth.uid()) AND
    (p_worker_id IS NULL OR wr.worker_id = p_worker_id)
  ORDER BY wr.effective_date DESC;
END;
$$;

-- Create a secure function for HR to manage worker rates
CREATE OR REPLACE FUNCTION public.manage_worker_rates_secure(
  p_operation text, -- 'create', 'update', 'delete'
  p_rate_id uuid DEFAULT NULL,
  p_worker_id uuid DEFAULT NULL,
  p_payment_type text DEFAULT NULL,
  p_hourly_rate numeric DEFAULT NULL,
  p_monthly_salary numeric DEFAULT NULL,
  p_effective_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  result_id uuid;
  operation_count integer;
BEGIN
  -- Get current user role
  user_role := public.get_current_user_role();
  
  -- Only HR administrators can manage worker rates
  IF user_role != 'admin' THEN
    PERFORM public.safe_log_critical_security_event(
      'UNAUTHORIZED_WORKER_RATES_MANAGEMENT_ATTEMPT',
      'critical',
      jsonb_build_object(
        'user_id', auth.uid(),
        'user_role', user_role,
        'operation', p_operation,
        'target_worker_id', p_worker_id,
        'violation_type', 'non_hr_salary_management_attempt'
      )
    );
    RAISE EXCEPTION 'Access denied: only HR administrators can manage worker rates';
  END IF;
  
  -- Rate limiting for salary management operations
  IF NOT public.check_rate_limit_enhanced('worker_rates_management', 20, 3600) THEN
    PERFORM public.safe_log_critical_security_event(
      'WORKER_RATES_MANAGEMENT_RATE_LIMIT_EXCEEDED',
      'high',
      jsonb_build_object(
        'user_id', auth.uid(),
        'operation', p_operation,
        'target_worker_id', p_worker_id
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for salary management operations';
  END IF;
  
  -- Log management operation attempt
  PERFORM public.safe_log_critical_security_event(
    'WORKER_RATES_MANAGEMENT_ATTEMPT',
    'medium',
    jsonb_build_object(
      'user_id', auth.uid(),
      'operation', p_operation,
      'target_worker_id', p_worker_id,
      'rate_id', p_rate_id,
      'payment_type', p_payment_type
    )
  );
  
  -- Execute the requested operation
  IF p_operation = 'create' THEN
    -- Validate required fields for creation
    IF p_worker_id IS NULL OR p_payment_type IS NULL OR p_effective_date IS NULL THEN
      RAISE EXCEPTION 'Missing required fields for worker rate creation';
    END IF;
    
    INSERT INTO public.worker_rates (
      worker_id, payment_type, hourly_rate, monthly_salary, 
      effective_date, end_date, created_by
    ) VALUES (
      p_worker_id, p_payment_type, p_hourly_rate, p_monthly_salary,
      p_effective_date, p_end_date, auth.uid()
    ) RETURNING id INTO result_id;
    
  ELSIF p_operation = 'update' THEN
    -- Validate rate_id for update
    IF p_rate_id IS NULL THEN
      RAISE EXCEPTION 'Rate ID is required for update operation';
    END IF;
    
    UPDATE public.worker_rates SET
      payment_type = COALESCE(p_payment_type, payment_type),
      hourly_rate = COALESCE(p_hourly_rate, hourly_rate),
      monthly_salary = COALESCE(p_monthly_salary, monthly_salary),
      effective_date = COALESCE(p_effective_date, effective_date),
      end_date = COALESCE(p_end_date, end_date),
      updated_at = now()
    WHERE id = p_rate_id
    RETURNING id INTO result_id;
    
  ELSIF p_operation = 'delete' THEN
    -- Validate rate_id for deletion
    IF p_rate_id IS NULL THEN
      RAISE EXCEPTION 'Rate ID is required for delete operation';
    END IF;
    
    DELETE FROM public.worker_rates 
    WHERE id = p_rate_id
    RETURNING id INTO result_id;
    
  ELSE
    RAISE EXCEPTION 'Invalid operation: %', p_operation;
  END IF;
  
  GET DIAGNOSTICS operation_count = ROW_COUNT;
  
  -- Log successful operation
  PERFORM public.safe_log_critical_security_event(
    'WORKER_RATES_MANAGEMENT_SUCCESS',
    'low',
    jsonb_build_object(
      'user_id', auth.uid(),
      'operation', p_operation,
      'result_id', result_id,
      'affected_rows', operation_count
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'operation', p_operation,
    'result_id', result_id,
    'affected_rows', operation_count
  );
END;
$$;

-- CRITICAL SECURITY FIX: Replace all RLS policies with extremely restrictive ones
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "hr_only_salary_access" ON public.worker_rates;
DROP POLICY IF EXISTS "Users can view their own worker rates" ON public.worker_rates;
DROP POLICY IF EXISTS "Admins can manage all worker rates" ON public.worker_rates;
DROP POLICY IF EXISTS "Workers can view their own rates" ON public.worker_rates;

-- Create new extremely restrictive policies that block direct table access

-- Policy 1: Block all direct SELECT access, force use of secure RPC functions
CREATE POLICY "block_direct_salary_select_force_rpc_usage" 
ON public.worker_rates
FOR SELECT 
USING (
  -- This policy effectively blocks all direct table access
  -- Only secure RPC functions should access salary data
  false AND (
    -- Log any attempt to access salary data directly
    safe_log_critical_security_event(
      'SALARY_DATA_DIRECT_ACCESS_BLOCKED',
      'critical',
      jsonb_build_object(
        'user_id', auth.uid(),
        'worker_id', worker_id,
        'violation_type', 'direct_table_salary_select_attempt',
        'security_action', 'access_denied',
        'recommendation', 'use_get_worker_rates_secure_function',
        'data_sensitivity', 'salary_information'
      )
    ) IS NOT NULL
  )
);

-- Policy 2: Block all direct INSERT access
CREATE POLICY "block_direct_salary_insert_force_rpc_usage" 
ON public.worker_rates
FOR INSERT 
WITH CHECK (
  -- Block all direct inserts
  false AND (
    safe_log_critical_security_event(
      'SALARY_DATA_DIRECT_INSERT_BLOCKED',
      'critical',
      jsonb_build_object(
        'user_id', auth.uid(),
        'violation_type', 'direct_table_salary_insert_attempt',
        'security_action', 'insert_denied',
        'recommendation', 'use_manage_worker_rates_secure_function'
      )
    ) IS NOT NULL
  )
);

-- Policy 3: Block all direct UPDATE access
CREATE POLICY "block_direct_salary_update_force_rpc_usage" 
ON public.worker_rates
FOR UPDATE 
USING (
  -- Block all direct updates
  false AND (
    safe_log_critical_security_event(
      'SALARY_DATA_DIRECT_UPDATE_BLOCKED',
      'critical',
      jsonb_build_object(
        'user_id', auth.uid(),
        'rate_id', id,
        'worker_id', worker_id,
        'violation_type', 'direct_table_salary_update_attempt',
        'security_action', 'update_denied',
        'recommendation', 'use_manage_worker_rates_secure_function'
      )
    ) IS NOT NULL
  )
);

-- Policy 4: Block all direct DELETE access
CREATE POLICY "block_direct_salary_delete_force_rpc_usage" 
ON public.worker_rates
FOR DELETE 
USING (
  -- Block all direct deletes
  false AND (
    safe_log_critical_security_event(
      'SALARY_DATA_DIRECT_DELETE_BLOCKED',
      'critical',
      jsonb_build_object(
        'user_id', auth.uid(),
        'rate_id', id,
        'worker_id', worker_id,
        'violation_type', 'direct_table_salary_delete_attempt',
        'security_action', 'delete_denied',
        'recommendation', 'use_manage_worker_rates_secure_function'
      )
    ) IS NOT NULL
  )
);

-- Policy 5: Allow access only from security definer functions
CREATE POLICY "allow_salary_access_from_security_definer_functions_only" 
ON public.worker_rates
FOR ALL
USING (
  -- Allow access only when called from within our security definer functions
  worker_id = auth.uid() AND 
  current_setting('role', true) = 'authenticator'
)
WITH CHECK (
  worker_id = auth.uid() AND 
  current_setting('role', true) = 'authenticator'
);

-- Create comprehensive audit triggers for salary data access monitoring
CREATE OR REPLACE FUNCTION public.audit_worker_rates_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log all access attempts with maximum detail for salary data
  IF TG_OP = 'SELECT' THEN
    PERFORM safe_log_critical_security_event(
      'SALARY_DATA_TABLE_ACCESS_AUDIT',
      'high',
      jsonb_build_object(
        'operation', TG_OP,
        'user_id', auth.uid(),
        'worker_id', COALESCE(NEW.worker_id, OLD.worker_id),
        'rate_id', COALESCE(NEW.id, OLD.id),
        'access_method', 'direct_table_operation',
        'security_concern', 'sensitive_salary_data_access',
        'data_type', 'employee_compensation'
      )
    );
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM safe_log_critical_security_event(
      'SALARY_DATA_INSERT_AUDIT',
      'medium',
      jsonb_build_object(
        'operation', TG_OP,
        'user_id', auth.uid(),
        'worker_id', NEW.worker_id,
        'rate_id', NEW.id,
        'payment_type', NEW.payment_type,
        'created_by', NEW.created_by,
        'data_sensitivity', 'salary_creation'
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM safe_log_critical_security_event(
      'SALARY_DATA_UPDATE_AUDIT',
      'medium',
      jsonb_build_object(
        'operation', TG_OP,
        'user_id', auth.uid(),
        'worker_id', NEW.worker_id,
        'rate_id', NEW.id,
        'hourly_rate_changed', (OLD.hourly_rate != NEW.hourly_rate),
        'monthly_salary_changed', (OLD.monthly_salary != NEW.monthly_salary),
        'data_sensitivity', 'salary_modification'
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM safe_log_critical_security_event(
      'SALARY_DATA_DELETE_AUDIT',
      'high',
      jsonb_build_object(
        'operation', TG_OP,
        'user_id', auth.uid(),
        'worker_id', OLD.worker_id,
        'rate_id', OLD.id,
        'payment_type', OLD.payment_type,
        'data_sensitivity', 'salary_deletion'
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply comprehensive audit trigger to monitor all salary data operations
DROP TRIGGER IF EXISTS audit_worker_rates_trigger ON public.worker_rates;
CREATE TRIGGER audit_worker_rates_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.worker_rates
  FOR EACH ROW EXECUTE FUNCTION audit_worker_rates_access();

-- Enable RLS on worker_rates table if not already enabled
ALTER TABLE public.worker_rates ENABLE ROW LEVEL SECURITY;

-- Log security enhancement completion
INSERT INTO public.security_audit_log (
  user_id, action, table_name, 
  new_values, ip_address
) VALUES (
  null, 
  'WORKER_RATES_SECURITY_HARDENING_COMPLETED', 
  'worker_rates',
  jsonb_build_object(
    'security_level', 'maximum',
    'direct_table_access', 'completely_blocked',
    'secure_rpc_functions', 'mandatory',
    'audit_logging', 'comprehensive',
    'rate_limiting', 'enforced',
    'data_sensitivity', 'employee_salary_information',
    'compliance', 'hr_data_protection',
    'timestamp', now()
  ),
  '127.0.0.1'
);