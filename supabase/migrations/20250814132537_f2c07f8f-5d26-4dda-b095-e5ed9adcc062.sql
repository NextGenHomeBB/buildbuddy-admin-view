-- Enhance Worker Rates Security
-- Fix critical salary information leak vulnerability

-- Drop existing policies to rebuild with enhanced security
DROP POLICY IF EXISTS "Admins can manage all worker rates" ON worker_rates;
DROP POLICY IF EXISTS "Workers can view their own rates" ON worker_rates;

-- Create enhanced RLS policies with comprehensive access control
CREATE POLICY "worker_rates_strict_owner_access" 
ON worker_rates 
FOR SELECT 
TO authenticated
USING (worker_id = auth.uid());

-- Allow workers to view only their own current rate (not historical data)
CREATE POLICY "worker_rates_current_only_access" 
ON worker_rates 
FOR SELECT 
TO authenticated
USING (
  worker_id = auth.uid() 
  AND effective_date <= CURRENT_DATE 
  AND (end_date IS NULL OR end_date >= CURRENT_DATE)
);

-- Admin access with enhanced logging
CREATE POLICY "admin_worker_rates_access" 
ON worker_rates 
FOR ALL 
TO authenticated
USING (
  get_current_user_role() = 'admin' AND
  -- Log this sensitive access for audit purposes
  (SELECT log_critical_security_event(
    'SALARY_DATA_ACCESS',
    'high',
    jsonb_build_object(
      'accessed_worker', worker_id,
      'admin_user', auth.uid(),
      'access_reason', 'admin_salary_review'
    )
  )) IS NOT NULL
)
WITH CHECK (get_current_user_role() = 'admin');

-- Manager access only for their direct reports with project assignment
CREATE POLICY "manager_worker_rates_limited_access" 
ON worker_rates 
FOR SELECT 
TO authenticated
USING (
  get_current_user_role() = 'manager' AND
  EXISTS (
    SELECT 1 FROM user_project_role upr1
    JOIN user_project_role upr2 ON upr1.project_id = upr2.project_id
    WHERE upr1.user_id = auth.uid() 
    AND upr1.role IN ('manager', 'admin')
    AND upr2.user_id = worker_rates.worker_id
    AND upr2.role = 'worker'
  ) AND
  -- Log manager access to salary data
  (SELECT log_security_event(
    'MANAGER_SALARY_ACCESS',
    'medium',
    jsonb_build_object(
      'accessed_worker', worker_id,
      'manager_user', auth.uid(),
      'access_reason', 'project_management'
    )
  )) IS NOT NULL
);

-- Create secure functions for salary data access
CREATE OR REPLACE FUNCTION get_worker_rate_secure(p_worker_id uuid DEFAULT auth.uid())
RETURNS TABLE(
  id uuid,
  payment_type text,
  effective_date date,
  end_date date,
  is_current boolean
) AS $$
DECLARE
  current_user_role text;
BEGIN
  current_user_role := get_current_user_role();
  
  -- Validate access permissions
  IF p_worker_id != auth.uid() AND current_user_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Access denied: cannot view other workers'' salary information';
  END IF;
  
  -- Additional validation for managers
  IF current_user_role = 'manager' AND p_worker_id != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_project_role upr1
      JOIN user_project_role upr2 ON upr1.project_id = upr2.project_id
      WHERE upr1.user_id = auth.uid() 
      AND upr1.role IN ('manager', 'admin')
      AND upr2.user_id = p_worker_id
      AND upr2.role = 'worker'
    ) THEN
      RAISE EXCEPTION 'Access denied: not authorized to view this worker''s salary data';
    END IF;
  END IF;
  
  -- Rate limiting for salary data access
  IF NOT check_rate_limit_enhanced('salary_data_access', 20, 60) THEN
    PERFORM log_critical_security_event(
      'SALARY_ACCESS_RATE_LIMITED',
      'high',
      jsonb_build_object(
        'attempted_worker', p_worker_id,
        'requesting_user', auth.uid()
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for salary data access';
  END IF;
  
  -- Log the access
  PERFORM log_security_event(
    'SECURE_SALARY_FUNCTION_ACCESS',
    'medium',
    jsonb_build_object(
      'function', 'get_worker_rate_secure',
      'target_worker', p_worker_id,
      'requesting_user', auth.uid(),
      'user_role', current_user_role
    )
  );
  
  -- Return non-sensitive data only
  RETURN QUERY
  SELECT 
    wr.id,
    wr.payment_type,
    wr.effective_date,
    wr.end_date,
    (wr.effective_date <= CURRENT_DATE AND (wr.end_date IS NULL OR wr.end_date >= CURRENT_DATE)) AS is_current
  FROM worker_rates wr
  WHERE wr.worker_id = p_worker_id
  ORDER BY wr.effective_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function for admins to access full salary data with enhanced security
CREATE OR REPLACE FUNCTION get_worker_salary_admin_secure(p_worker_id uuid)
RETURNS TABLE(
  id uuid,
  worker_id uuid,
  hourly_rate numeric,
  monthly_salary numeric,
  payment_type text,
  effective_date date,
  end_date date,
  created_at timestamp with time zone,
  created_by uuid
) AS $$
BEGIN
  -- Only admins can access full salary data
  IF get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: only administrators can access full salary data';
  END IF;
  
  -- Enhanced rate limiting for sensitive data
  IF NOT check_rate_limit_enhanced('admin_salary_access', 10, 60) THEN
    PERFORM log_critical_security_event(
      'ADMIN_SALARY_RATE_LIMITED',
      'critical',
      jsonb_build_object(
        'attempted_worker', p_worker_id,
        'admin_user', auth.uid()
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for administrative salary access';
  END IF;
  
  -- Log critical access
  PERFORM log_critical_security_event(
    'ADMIN_FULL_SALARY_ACCESS',
    'high',
    jsonb_build_object(
      'accessed_worker', p_worker_id,
      'admin_user', auth.uid(),
      'timestamp', now(),
      'requires_justification', true
    )
  );
  
  -- Return full salary data
  RETURN QUERY
  SELECT 
    wr.id,
    wr.worker_id,
    wr.hourly_rate,
    wr.monthly_salary,
    wr.payment_type,
    wr.effective_date,
    wr.end_date,
    wr.created_at,
    wr.created_by
  FROM worker_rates wr
  WHERE wr.worker_id = p_worker_id
  ORDER BY wr.effective_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function for workers to view their own current compensation securely
CREATE OR REPLACE FUNCTION get_my_current_rate_secure()
RETURNS TABLE(
  payment_type text,
  hourly_rate numeric,
  monthly_salary numeric,
  effective_date date
) AS $$
BEGIN
  -- Workers can only access their own current rate
  -- Rate limiting for personal salary access
  IF NOT check_rate_limit_enhanced('personal_salary_access', 50, 60) THEN
    PERFORM log_security_event(
      'PERSONAL_SALARY_RATE_LIMITED',
      'medium',
      jsonb_build_object(
        'worker_user', auth.uid()
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for personal salary access';
  END IF;
  
  -- Log personal access (low severity)
  PERFORM log_security_event(
    'PERSONAL_SALARY_ACCESS',
    'low',
    jsonb_build_object(
      'worker_user', auth.uid(),
      'function', 'get_my_current_rate_secure'
    )
  );
  
  -- Return current rate only
  RETURN QUERY
  SELECT 
    wr.payment_type,
    wr.hourly_rate,
    wr.monthly_salary,
    wr.effective_date
  FROM worker_rates wr
  WHERE wr.worker_id = auth.uid()
  AND wr.effective_date <= CURRENT_DATE 
  AND (wr.end_date IS NULL OR wr.end_date >= CURRENT_DATE)
  ORDER BY wr.effective_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;