-- Implement HR-Only Salary Data Access
-- Remove manager access to salary data, restrict to HR administrators only

-- Drop the manager access policy that allows salary data viewing
DROP POLICY IF EXISTS "manager_worker_rates_limited_access" ON worker_rates;

-- Drop admin policy to rebuild with HR-specific requirements
DROP POLICY IF EXISTS "admin_worker_rates_access" ON worker_rates;

-- Create enhanced HR role checking function
CREATE OR REPLACE FUNCTION is_hr_administrator()
RETURNS boolean AS $$
BEGIN
  -- Check if user has admin role AND HR permissions
  -- This could be extended to check for specific HR role in the future
  RETURN (
    get_current_user_role() = 'admin' AND
    -- Additional HR validation could be added here
    -- For now, we'll use admin role as HR role
    auth.uid() IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create strict HR-only access policy for salary data
CREATE POLICY "hr_only_salary_access" 
ON worker_rates 
FOR ALL 
TO authenticated
USING (
  is_hr_administrator() AND
  -- Log critical HR access to salary data
  (SELECT log_critical_security_event(
    'HR_SALARY_DATA_ACCESS',
    'critical',
    jsonb_build_object(
      'accessed_worker', worker_id,
      'hr_admin', auth.uid(),
      'access_reason', 'hr_administration',
      'requires_justification', true,
      'access_type', 'full_salary_data'
    )
  )) IS NOT NULL
)
WITH CHECK (is_hr_administrator());

-- Update secure functions to remove manager access to salary amounts
DROP FUNCTION IF EXISTS get_worker_rate_secure(uuid);

-- Create new function with HR-only salary access
CREATE OR REPLACE FUNCTION get_worker_rate_metadata(p_worker_id uuid DEFAULT auth.uid())
RETURNS TABLE(
  id uuid,
  payment_type text,
  effective_date date,
  end_date date,
  is_current boolean,
  has_active_rate boolean
) AS $$
DECLARE
  current_user_role text;
BEGIN
  current_user_role := get_current_user_role();
  
  -- Only allow access to own data or HR administrators
  IF p_worker_id != auth.uid() AND NOT is_hr_administrator() THEN
    RAISE EXCEPTION 'Access denied: salary information restricted to HR administrators only';
  END IF;
  
  -- Rate limiting for salary metadata access
  IF NOT check_rate_limit_enhanced('salary_metadata_access', 30, 60) THEN
    PERFORM log_critical_security_event(
      'SALARY_METADATA_RATE_LIMITED',
      'high',
      jsonb_build_object(
        'attempted_worker', p_worker_id,
        'requesting_user', auth.uid()
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for salary metadata access';
  END IF;
  
  -- Log access (different severity for self vs HR access)
  PERFORM log_security_event(
    CASE 
      WHEN p_worker_id = auth.uid() THEN 'SELF_SALARY_METADATA_ACCESS'
      ELSE 'HR_SALARY_METADATA_ACCESS'
    END,
    CASE 
      WHEN p_worker_id = auth.uid() THEN 'low'
      ELSE 'high'
    END,
    jsonb_build_object(
      'function', 'get_worker_rate_metadata',
      'target_worker', p_worker_id,
      'requesting_user', auth.uid(),
      'user_role', current_user_role
    )
  );
  
  -- Return only non-sensitive metadata
  RETURN QUERY
  SELECT 
    wr.id,
    wr.payment_type,
    wr.effective_date,
    wr.end_date,
    (wr.effective_date <= CURRENT_DATE AND (wr.end_date IS NULL OR wr.end_date >= CURRENT_DATE)) AS is_current,
    EXISTS(
      SELECT 1 FROM worker_rates wr2 
      WHERE wr2.worker_id = p_worker_id 
      AND wr2.effective_date <= CURRENT_DATE 
      AND (wr2.end_date IS NULL OR wr2.end_date >= CURRENT_DATE)
    ) AS has_active_rate
  FROM worker_rates wr
  WHERE wr.worker_id = p_worker_id
  ORDER BY wr.effective_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the admin salary function to require HR authorization
DROP FUNCTION IF EXISTS get_worker_salary_admin_secure(uuid);

-- Create HR-only salary data access function
CREATE OR REPLACE FUNCTION get_worker_salary_hr_secure(p_worker_id uuid, p_justification text DEFAULT 'HR Administration')
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
  -- Strict HR-only access
  IF NOT is_hr_administrator() THEN
    RAISE EXCEPTION 'Access denied: salary data access restricted to HR administrators only';
  END IF;
  
  -- Validate justification is provided
  IF p_justification IS NULL OR trim(p_justification) = '' THEN
    RAISE EXCEPTION 'Access denied: justification required for salary data access';
  END IF;
  
  -- Enhanced rate limiting for HR salary access
  IF NOT check_rate_limit_enhanced('hr_salary_access', 5, 60) THEN
    PERFORM log_critical_security_event(
      'HR_SALARY_RATE_LIMITED',
      'critical',
      jsonb_build_object(
        'attempted_worker', p_worker_id,
        'hr_admin', auth.uid(),
        'justification', p_justification
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for HR salary access';
  END IF;
  
  -- Log critical HR access with justification
  PERFORM log_critical_security_event(
    'HR_FULL_SALARY_ACCESS',
    'critical',
    jsonb_build_object(
      'accessed_worker', p_worker_id,
      'hr_admin', auth.uid(),
      'justification', p_justification,
      'timestamp', now(),
      'requires_audit_review', true,
      'access_classification', 'highly_sensitive'
    )
  );
  
  -- Return full salary data for HR
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

-- Create function for managers to check if worker has compensation set (without seeing amounts)
CREATE OR REPLACE FUNCTION check_worker_compensation_status(p_worker_id uuid)
RETURNS TABLE(
  has_compensation boolean,
  payment_type text,
  effective_from date,
  is_current boolean
) AS $$
BEGIN
  -- Managers can only check compensation status for workers on their projects
  IF get_current_user_role() = 'manager' THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_project_role upr1
      JOIN user_project_role upr2 ON upr1.project_id = upr2.project_id
      WHERE upr1.user_id = auth.uid() 
      AND upr1.role IN ('manager', 'admin')
      AND upr2.user_id = p_worker_id
      AND upr2.role = 'worker'
    ) THEN
      RAISE EXCEPTION 'Access denied: not authorized to check this worker''s compensation status';
    END IF;
  ELSIF get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions to check compensation status';
  END IF;
  
  -- Log manager access to compensation status (not actual amounts)
  PERFORM log_security_event(
    'COMPENSATION_STATUS_CHECK',
    'low',
    jsonb_build_object(
      'checked_worker', p_worker_id,
      'manager_user', auth.uid(),
      'access_type', 'status_only'
    )
  );
  
  -- Return only status information, no actual salary amounts
  RETURN QUERY
  SELECT 
    EXISTS(SELECT 1 FROM worker_rates WHERE worker_id = p_worker_id) AS has_compensation,
    CASE 
      WHEN EXISTS(SELECT 1 FROM worker_rates WHERE worker_id = p_worker_id) 
      THEN (SELECT payment_type FROM worker_rates WHERE worker_id = p_worker_id AND effective_date <= CURRENT_DATE AND (end_date IS NULL OR end_date >= CURRENT_DATE) ORDER BY effective_date DESC LIMIT 1)
      ELSE NULL 
    END AS payment_type,
    (SELECT effective_date FROM worker_rates WHERE worker_id = p_worker_id AND effective_date <= CURRENT_DATE AND (end_date IS NULL OR end_date >= CURRENT_DATE) ORDER BY effective_date DESC LIMIT 1) AS effective_from,
    EXISTS(
      SELECT 1 FROM worker_rates 
      WHERE worker_id = p_worker_id 
      AND effective_date <= CURRENT_DATE 
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    ) AS is_current;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;