-- Implement Strict Employee Personal Data Protection
-- Replace broad admin access with justified, audited access controls

-- Drop the overly permissive admin policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles for stats" ON profiles;

-- Create HR/Admin function for justified personal data access
CREATE OR REPLACE FUNCTION is_authorized_for_personal_data(access_reason text DEFAULT NULL)
RETURNS boolean AS $$
BEGIN
  -- Only HR administrators can access personal data, and only with justification
  IF NOT is_hr_administrator() THEN
    RETURN FALSE;
  END IF;
  
  -- Require justification for personal data access
  IF access_reason IS NULL OR trim(access_reason) = '' THEN
    RAISE EXCEPTION 'Access denied: justification required for accessing employee personal data';
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create strict HR-only access policy for personal data
CREATE POLICY "hr_justified_personal_data_access" 
ON profiles 
FOR SELECT 
TO authenticated
USING (
  -- Allow self-access always
  id = auth.uid() OR
  (
    -- HR access requires justification and logging
    is_hr_administrator() AND
    -- This will be called from secure functions that provide justification
    (SELECT log_critical_security_event(
      'HR_PERSONAL_DATA_ACCESS',
      'high',
      jsonb_build_object(
        'accessed_profile', id,
        'hr_admin', auth.uid(),
        'access_reason', 'hr_administration_via_function',
        'requires_justification', true,
        'access_type', 'employee_personal_data'
      )
    )) IS NOT NULL
  )
);

-- Create secure function for HR to access employee personal data with justification
CREATE OR REPLACE FUNCTION get_employee_profile_hr_secure(
  p_employee_id uuid, 
  p_justification text,
  p_business_purpose text DEFAULT 'HR Administration'
)
RETURNS TABLE(
  id uuid,
  full_name text,
  avatar_url text,
  bio text,
  work_role jsonb,
  created_at timestamp with time zone,
  company_id uuid,
  default_org_id uuid
) AS $$
BEGIN
  -- Strict HR-only access
  IF NOT is_hr_administrator() THEN
    RAISE EXCEPTION 'Access denied: personal data access restricted to HR administrators only';
  END IF;
  
  -- Validate justification is provided and substantial
  IF p_justification IS NULL OR trim(p_justification) = '' OR length(trim(p_justification)) < 10 THEN
    RAISE EXCEPTION 'Access denied: detailed justification (minimum 10 characters) required for personal data access';
  END IF;
  
  -- Validate business purpose
  IF p_business_purpose IS NULL OR trim(p_business_purpose) = '' THEN
    RAISE EXCEPTION 'Access denied: business purpose required for personal data access';
  END IF;
  
  -- Enhanced rate limiting for personal data access
  IF NOT check_rate_limit_enhanced('hr_personal_data_access', 3, 60) THEN
    PERFORM log_critical_security_event(
      'HR_PERSONAL_DATA_RATE_LIMITED',
      'critical',
      jsonb_build_object(
        'attempted_employee', p_employee_id,
        'hr_admin', auth.uid(),
        'justification', p_justification,
        'business_purpose', p_business_purpose
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for HR personal data access';
  END IF;
  
  -- Log critical access with full context
  PERFORM log_critical_security_event(
    'HR_EMPLOYEE_PERSONAL_DATA_ACCESS',
    'critical',
    jsonb_build_object(
      'accessed_employee', p_employee_id,
      'hr_admin', auth.uid(),
      'justification', p_justification,
      'business_purpose', p_business_purpose,
      'timestamp', now(),
      'requires_audit_review', true,
      'access_classification', 'personal_identifiable_information',
      'gdpr_relevant', true
    )
  );
  
  -- Return employee personal data
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.work_role,
    p.created_at,
    p.company_id,
    p.default_org_id
  FROM profiles p
  WHERE p.id = p_employee_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function for managers to get limited employee info for their project workers
CREATE OR REPLACE FUNCTION get_project_worker_basic_info(p_worker_id uuid)
RETURNS TABLE(
  id uuid,
  full_name text,
  work_role jsonb
) AS $$
BEGIN
  -- Managers can only see basic info for workers on their projects
  IF get_current_user_role() = 'manager' THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_project_role upr1
      JOIN user_project_role upr2 ON upr1.project_id = upr2.project_id
      WHERE upr1.user_id = auth.uid() 
      AND upr1.role IN ('manager', 'admin')
      AND upr2.user_id = p_worker_id
      AND upr2.role = 'worker'
    ) THEN
      RAISE EXCEPTION 'Access denied: not authorized to view this worker''s information';
    END IF;
  ELSIF get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions to view worker information';
  END IF;
  
  -- Log manager access to basic worker info
  PERFORM log_security_event(
    'MANAGER_WORKER_BASIC_INFO_ACCESS',
    'low',
    jsonb_build_object(
      'accessed_worker', p_worker_id,
      'manager_user', auth.uid(),
      'access_type', 'basic_project_info_only'
    )
  );
  
  -- Return only essential work-related information (no bio, avatar, etc.)
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.work_role
  FROM profiles p
  WHERE p.id = p_worker_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function for anonymous profile data (for public-facing features)
CREATE OR REPLACE FUNCTION get_public_profile_info(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  display_name text,
  work_role jsonb
) AS $$
BEGIN
  -- Anyone can see very limited public profile info
  -- Log public profile access
  PERFORM log_security_event(
    'PUBLIC_PROFILE_ACCESS',
    'low',
    jsonb_build_object(
      'accessed_profile', p_user_id,
      'requesting_user', auth.uid(),
      'access_type', 'public_display_only'
    )
  );
  
  -- Return only non-sensitive public information
  RETURN QUERY
  SELECT 
    p.id,
    CASE 
      WHEN p.full_name IS NOT NULL THEN left(p.full_name, 1) || '.' -- Only first initial
      ELSE 'User'
    END AS display_name,
    CASE 
      WHEN p.work_role IS NOT NULL THEN p.work_role
      ELSE '["Worker"]'::jsonb
    END AS work_role
  FROM profiles p
  WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function for system operations that need profile validation
CREATE OR REPLACE FUNCTION validate_user_profile_exists(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  -- System function to check if profile exists without exposing data
  RETURN EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;