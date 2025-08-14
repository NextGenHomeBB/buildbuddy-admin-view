-- Phase 2: Fix function conflicts and implement secure access functions

-- 1. Drop existing functions first
DROP FUNCTION IF EXISTS public.get_worker_rates_masked(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_project_costs_secure(uuid) CASCADE;

-- 2. Create secure worker rates function with masking
CREATE OR REPLACE FUNCTION public.get_worker_rates_masked(
  p_worker_id uuid DEFAULT NULL
) RETURNS TABLE(
  id uuid,
  worker_id uuid,
  hourly_rate numeric,
  monthly_salary numeric,
  payment_type text,
  effective_date date,
  end_date date,
  worker_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role text;
  has_access boolean := false;
BEGIN
  -- Get current user role
  user_role := public.get_current_user_role();
  
  -- Rate limiting for salary data access
  IF NOT public.check_rate_limit_enhanced('worker_rates_access', 15, 60) THEN
    PERFORM public.log_critical_security_event(
      'WORKER_RATES_RATE_LIMIT_EXCEEDED',
      'high',
      jsonb_build_object(
        'user_role', user_role,
        'worker_id', p_worker_id
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for worker rates access';
  END IF;
  
  -- Determine access level
  has_access := (user_role = 'admin' OR auth.uid() = p_worker_id);
  
  -- Log access attempt
  PERFORM public.log_critical_security_event(
    'WORKER_RATES_MASKED_ACCESS',
    'high',
    jsonb_build_object(
      'user_role', user_role,
      'worker_id', p_worker_id,
      'self_access', auth.uid() = p_worker_id,
      'has_full_access', has_access
    )
  );
  
  -- Return data with appropriate masking
  RETURN QUERY
  SELECT 
    wr.id,
    wr.worker_id,
    CASE
      WHEN has_access THEN wr.hourly_rate
      ELSE NULL::numeric
    END,
    CASE
      WHEN has_access THEN wr.monthly_salary  
      ELSE NULL::numeric
    END,
    wr.payment_type,
    wr.effective_date,
    wr.end_date,
    CASE
      WHEN has_access THEN p.full_name
      ELSE concat(left(p.full_name, 3), '***')
    END
  FROM public.worker_rates wr
  LEFT JOIN public.profiles p ON p.id = wr.worker_id
  WHERE 
    (user_role = 'admin' OR 
     wr.worker_id = auth.uid() OR
     (p_worker_id IS NOT NULL AND wr.worker_id = p_worker_id))
    AND (p_worker_id IS NULL OR wr.worker_id = p_worker_id)
  ORDER BY wr.effective_date DESC;
END;
$$;

-- 3. Create secure project costs function
CREATE OR REPLACE FUNCTION public.get_project_costs_secure(
  p_project_id uuid DEFAULT NULL
) RETURNS TABLE(
  project_id uuid,
  project_name text,
  total_labor_cost numeric,
  total_material_cost numeric,
  total_expense_cost numeric,
  total_cost numeric,
  budget numeric,
  budget_variance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role text;
  has_project_access boolean := false;
BEGIN
  -- Get current user role
  user_role := public.get_current_user_role();
  
  -- Rate limiting for financial data access
  IF NOT public.check_rate_limit_enhanced('project_costs_access', 10, 60) THEN
    PERFORM public.log_critical_security_event(
      'PROJECT_COSTS_RATE_LIMIT_EXCEEDED',
      'high',
      jsonb_build_object(
        'user_role', user_role,
        'project_id', p_project_id
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for project costs access';
  END IF;
  
  -- Check project access for non-admin users
  IF user_role != 'admin' AND p_project_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = p_project_id
      AND upr.role IN ('manager', 'admin')
    ) INTO has_project_access;
    
    IF NOT has_project_access THEN
      PERFORM public.log_critical_security_event(
        'UNAUTHORIZED_PROJECT_COSTS_ACCESS',
        'high',
        jsonb_build_object(
          'user_role', user_role,
          'project_id', p_project_id
        )
      );
      RAISE EXCEPTION 'Access denied: insufficient project permissions';
    END IF;
  END IF;
  
  -- Log access attempt
  PERFORM public.log_critical_security_event(
    'PROJECT_COSTS_SECURE_ACCESS',
    'medium',
    jsonb_build_object(
      'user_role', user_role,
      'project_id', p_project_id,
      'has_access', has_project_access OR user_role = 'admin'
    )
  );
  
  -- Return data based on access level
  RETURN QUERY
  SELECT 
    pcv.project_id,
    pcv.project_name,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.total_labor_cost
      ELSE NULL::numeric
    END,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.total_material_cost
      ELSE NULL::numeric
    END,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.total_expense_cost
      ELSE NULL::numeric
    END,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.total_cost
      ELSE NULL::numeric
    END,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.budget
      ELSE NULL::numeric
    END,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.budget_variance
      ELSE NULL::numeric
    END
  FROM project_costs_vw pcv
  WHERE 
    (user_role = 'admin' OR 
     (p_project_id IS NOT NULL AND has_project_access) OR
     EXISTS (
       SELECT 1 FROM user_project_role upr
       WHERE upr.user_id = auth.uid() 
       AND upr.project_id = pcv.project_id
       AND upr.role IN ('manager', 'admin')
     ))
    AND (p_project_id IS NULL OR pcv.project_id = p_project_id);
END;
$$;