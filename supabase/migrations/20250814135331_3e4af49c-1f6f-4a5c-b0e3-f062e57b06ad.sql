-- Phase 1: Critical Security Fixes - Database Hardening

-- Fix database function security by adding search_path protection
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role::text 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'worker' THEN 3
    END
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Create enhanced payroll data protection function
CREATE OR REPLACE FUNCTION public.get_payroll_data_secure(p_worker_id uuid DEFAULT NULL, p_date_from date DEFAULT NULL, p_date_to date DEFAULT NULL)
RETURNS TABLE(
  worker_id uuid,
  payment_date date,
  amount numeric,
  payment_type text,
  hours_worked numeric,
  hourly_rate numeric,
  project_name text,
  masked_worker_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  is_hr_admin boolean := false;
BEGIN
  -- Get current user role securely
  user_role := public.get_current_user_role();
  
  -- Check if user is HR admin (admin with specific HR permissions)
  is_hr_admin := (user_role = 'admin');
  
  -- Rate limiting for payroll data access
  IF NOT public.check_rate_limit_enhanced('payroll_data_access', 5, 3600) THEN
    PERFORM public.log_critical_security_event(
      'PAYROLL_DATA_RATE_LIMIT_EXCEEDED',
      'critical',
      jsonb_build_object(
        'requested_worker', p_worker_id,
        'user_role', user_role,
        'is_hr_admin', is_hr_admin
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for payroll data access';
  END IF;
  
  -- Log high-priority payroll access
  PERFORM public.log_critical_security_event(
    'PAYROLL_DATA_ACCESS_ATTEMPT',
    'high',
    jsonb_build_object(
      'requested_worker', p_worker_id,
      'user_role', user_role,
      'is_hr_admin', is_hr_admin,
      'date_range', jsonb_build_object('from', p_date_from, 'to', p_date_to)
    )
  );
  
  -- Only HR admins can access payroll data
  IF NOT is_hr_admin THEN
    -- Workers can only see their own data, but heavily masked
    IF user_role = 'worker' AND (p_worker_id IS NULL OR p_worker_id = auth.uid()) THEN
      RETURN QUERY
      SELECT 
        wp.worker_id,
        wp.payment_date,
        wp.amount,
        wp.payment_type,
        wp.hours_worked,
        NULL::numeric as hourly_rate, -- Hide rate
        'PROJECT_MASKED'::text as project_name,
        'SELF'::text as masked_worker_name
      FROM public.worker_payments wp
      WHERE wp.worker_id = auth.uid()
      AND (p_date_from IS NULL OR wp.payment_date >= p_date_from)
      AND (p_date_to IS NULL OR wp.payment_date <= p_date_to)
      ORDER BY wp.payment_date DESC;
    ELSE
      RAISE EXCEPTION 'Access denied: insufficient permissions for payroll data';
    END IF;
  ELSE
    -- HR admins get full access but still log it
    RETURN QUERY
    SELECT 
      wp.worker_id,
      wp.payment_date,
      wp.amount,
      wp.payment_type,
      wp.hours_worked,
      wr.hourly_rate,
      COALESCE(p.name, 'Unknown Project') as project_name,
      COALESCE(prof.full_name, 'Unknown Worker') as masked_worker_name
    FROM public.worker_payments wp
    LEFT JOIN public.worker_rates wr ON wr.worker_id = wp.worker_id
    LEFT JOIN public.projects p ON p.id = wp.project_id
    LEFT JOIN public.profiles prof ON prof.id = wp.worker_id
    WHERE (p_worker_id IS NULL OR wp.worker_id = p_worker_id)
    AND (p_date_from IS NULL OR wp.payment_date >= p_date_from)
    AND (p_date_to IS NULL OR wp.payment_date <= p_date_to)
    ORDER BY wp.payment_date DESC;
  END IF;
END;
$$;

-- Enhanced financial data masking function
CREATE OR REPLACE FUNCTION public.get_financial_summary_secure(p_project_id uuid DEFAULT NULL)
RETURNS TABLE(
  project_id uuid,
  project_name text,
  total_budget numeric,
  total_spent numeric,
  budget_variance numeric,
  completion_percentage numeric,
  access_level text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  has_full_access boolean := false;
BEGIN
  user_role := public.get_current_user_role();
  
  -- Determine access level
  has_full_access := (
    user_role = 'admin' OR
    (user_role = 'manager' AND EXISTS (
      SELECT 1 FROM public.user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND (p_project_id IS NULL OR upr.project_id = p_project_id)
      AND upr.role IN ('manager', 'admin')
    ))
  );
  
  -- Log financial data access
  PERFORM public.log_critical_security_event(
    'FINANCIAL_SUMMARY_ACCESS',
    'medium',
    jsonb_build_object(
      'user_role', user_role,
      'has_full_access', has_full_access,
      'project_filter', p_project_id
    )
  );
  
  IF has_full_access THEN
    -- Full access for authorized users
    RETURN QUERY
    SELECT 
      p.id,
      p.name,
      p.budget,
      COALESCE(SUM(pc.total_committed), 0) as total_spent,
      p.budget - COALESCE(SUM(pc.total_committed), 0) as budget_variance,
      p.progress,
      'full'::text as access_level
    FROM public.projects p
    LEFT JOIN public.phase_costs_vw pc ON pc.project_id = p.id
    WHERE (p_project_id IS NULL OR p.id = p_project_id)
    AND (user_role = 'admin' OR EXISTS (
      SELECT 1 FROM public.user_project_role upr
      WHERE upr.user_id = auth.uid() AND upr.project_id = p.id
    ))
    GROUP BY p.id, p.name, p.budget, p.progress;
  ELSE
    -- Limited access with data masking
    RETURN QUERY
    SELECT 
      p.id,
      p.name,
      NULL::numeric as total_budget, -- Hide budget details
      NULL::numeric as total_spent,
      NULL::numeric as budget_variance,
      p.progress,
      'limited'::text as access_level
    FROM public.projects p
    WHERE EXISTS (
      SELECT 1 FROM public.user_project_role upr
      WHERE upr.user_id = auth.uid() AND upr.project_id = p.id
    )
    AND (p_project_id IS NULL OR p.id = p_project_id);
  END IF;
END;
$$;