-- Continue with security implementation without dropping existing functions

-- Enhanced worker rates secure function (if not exists)
CREATE OR REPLACE FUNCTION public.get_worker_rates_secure(
  p_worker_id uuid DEFAULT NULL,
  p_effective_date text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  worker_id uuid,
  hourly_rate numeric,
  monthly_salary numeric,
  payment_type text,
  effective_date timestamp with time zone,
  end_date timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  target_worker_id uuid;
  effective_date_parsed timestamp with time zone;
BEGIN
  -- Get current user role
  user_role := get_current_user_role();
  target_worker_id := COALESCE(p_worker_id, auth.uid());
  
  -- Parse effective date
  IF p_effective_date IS NOT NULL THEN
    effective_date_parsed := p_effective_date::timestamp with time zone;
  ELSE
    effective_date_parsed := now();
  END IF;
  
  -- Enhanced rate limiting for worker rates access
  IF NOT check_rate_limit_enhanced('worker_rates_access', 15, 60) THEN
    PERFORM log_critical_security_event(
      'WORKER_RATES_RATE_LIMIT_EXCEEDED',
      'high',
      jsonb_build_object(
        'user_role', user_role,
        'target_worker_id', target_worker_id,
        'effective_date', p_effective_date
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for worker rates access';
  END IF;
  
  -- Security checks
  IF user_role != 'admin' AND target_worker_id != auth.uid() THEN
    PERFORM log_critical_security_event(
      'UNAUTHORIZED_WORKER_RATES_ACCESS_ATTEMPT',
      'critical',
      jsonb_build_object(
        'target_worker_id', target_worker_id,
        'requesting_user', auth.uid(),
        'user_role', user_role
      )
    );
    RAISE EXCEPTION 'Access denied: can only access own worker rates unless admin';
  END IF;
  
  -- Log legitimate access
  PERFORM log_critical_security_event(
    'WORKER_RATES_SECURE_ACCESS',
    'medium',
    jsonb_build_object(
      'target_worker_id', target_worker_id,
      'user_role', user_role,
      'effective_date', effective_date_parsed
    )
  );
  
  -- Return data with role-based filtering
  RETURN QUERY
  SELECT 
    wr.id,
    wr.worker_id,
    CASE
      WHEN user_role = 'admin' OR wr.worker_id = auth.uid() THEN wr.hourly_rate
      ELSE NULL::numeric
    END AS hourly_rate,
    CASE
      WHEN user_role = 'admin' OR wr.worker_id = auth.uid() THEN wr.monthly_salary
      ELSE NULL::numeric
    END AS monthly_salary,
    wr.payment_type,
    wr.effective_date,
    wr.end_date,
    wr.created_at,
    wr.updated_at
  FROM public.worker_rates wr
  WHERE 
    (p_worker_id IS NULL OR wr.worker_id = target_worker_id)
    AND (p_effective_date IS NULL OR wr.effective_date <= effective_date_parsed)
    AND (wr.end_date IS NULL OR wr.end_date >= effective_date_parsed)
    AND (user_role = 'admin' OR wr.worker_id = auth.uid())
  ORDER BY wr.effective_date DESC;
END;
$$;

-- Enhanced financial summary secure function  
CREATE OR REPLACE FUNCTION public.get_financial_summary_secure(
  p_project_id uuid DEFAULT NULL
)
RETURNS TABLE(
  project_id uuid,
  project_name text,
  total_budget numeric,
  total_committed numeric,
  total_actual numeric,
  variance numeric,
  variance_percentage numeric,
  last_updated timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  has_project_access boolean := false;
BEGIN
  -- Get current user role
  user_role := get_current_user_role();
  
  -- Enhanced rate limiting for financial data access
  IF NOT check_rate_limit_enhanced('financial_summary_access', 30, 60) THEN
    PERFORM log_critical_security_event(
      'FINANCIAL_SUMMARY_RATE_LIMIT_EXCEEDED',
      'high',
      jsonb_build_object(
        'user_role', user_role,
        'project_id', p_project_id
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for financial summary access';
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
      PERFORM log_critical_security_event(
        'UNAUTHORIZED_FINANCIAL_ACCESS_ATTEMPT',
        'critical',
        jsonb_build_object(
          'project_id', p_project_id,
          'user_role', user_role,
          'requesting_user', auth.uid()
        )
      );
      RAISE EXCEPTION 'Access denied: insufficient project permissions for financial data';
    END IF;
  END IF;
  
  -- Log legitimate access
  PERFORM log_critical_security_event(
    'FINANCIAL_SUMMARY_SECURE_ACCESS',
    'medium',
    jsonb_build_object(
      'user_role', user_role,
      'project_id', p_project_id,
      'has_project_access', has_project_access
    )
  );
  
  -- Return financial data with role-based filtering
  RETURN QUERY
  SELECT 
    p.id AS project_id,
    p.name AS project_name,
    -- Only show financial data to authorized users
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN p.budget
      ELSE NULL::numeric
    END AS total_budget,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN 
        COALESCE(
          (SELECT SUM(total_cost) FROM phase_material_costs pmc 
           JOIN project_phases pp ON pmc.phase_id = pp.id 
           WHERE pp.project_id = p.id), 0
        ) +
        COALESCE(
          (SELECT SUM(total_actual_cost) FROM phase_labor_costs plc 
           JOIN project_phases pp ON plc.phase_id = pp.id 
           WHERE pp.project_id = p.id), 0
        ) +
        COALESCE(
          (SELECT SUM(amount) FROM phase_expenses pe 
           JOIN project_phases pp ON pe.phase_id = pp.id 
           WHERE pp.project_id = p.id), 0
        )
      ELSE NULL::numeric
    END AS total_committed,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN 
        COALESCE(
          (SELECT SUM(total_actual_cost) FROM phase_labor_costs plc 
           JOIN project_phases pp ON plc.phase_id = pp.id 
           WHERE pp.project_id = p.id), 0
        )
      ELSE NULL::numeric
    END AS total_actual,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN 
        p.budget - COALESCE(
          (SELECT SUM(total_cost) FROM phase_material_costs pmc 
           JOIN project_phases pp ON pmc.phase_id = pp.id 
           WHERE pp.project_id = p.id), 0
        ) -
        COALESCE(
          (SELECT SUM(total_actual_cost) FROM phase_labor_costs plc 
           JOIN project_phases pp ON plc.phase_id = pp.id 
           WHERE pp.project_id = p.id), 0
        ) -
        COALESCE(
          (SELECT SUM(amount) FROM phase_expenses pe 
           JOIN project_phases pp ON pe.phase_id = pp.id 
           WHERE pp.project_id = p.id), 0
        )
      ELSE NULL::numeric
    END AS variance,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN 
        CASE WHEN p.budget > 0 THEN
          ((p.budget - COALESCE(
            (SELECT SUM(total_cost) FROM phase_material_costs pmc 
             JOIN project_phases pp ON pmc.phase_id = pp.id 
             WHERE pp.project_id = p.id), 0
          ) -
          COALESCE(
            (SELECT SUM(total_actual_cost) FROM phase_labor_costs plc 
             JOIN project_phases pp ON plc.phase_id = pp.id 
             WHERE pp.project_id = p.id), 0
          ) -
          COALESCE(
            (SELECT SUM(amount) FROM phase_expenses pe 
             JOIN project_phases pp ON pe.phase_id = pp.id 
             WHERE pp.project_id = p.id), 0
          )) / p.budget) * 100
        ELSE 0
        END
      ELSE NULL::numeric
    END AS variance_percentage,
    now() AS last_updated
  FROM public.projects p
  WHERE 
    (user_role = 'admin' OR 
     EXISTS (
       SELECT 1 FROM user_project_role upr
       WHERE upr.user_id = auth.uid() 
       AND upr.project_id = p.id
       AND upr.role IN ('manager', 'admin')
     ))
    AND (p_project_id IS NULL OR p.id = p_project_id)
  ORDER BY p.name;
END;
$$;

-- Enhanced payroll data secure function
CREATE OR REPLACE FUNCTION public.get_payroll_data_secure(
  p_worker_id uuid DEFAULT NULL,
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL
)
RETURNS TABLE(
  worker_id uuid,
  worker_name text,
  pay_period_start date,
  pay_period_end date,
  hours_worked numeric,
  regular_pay numeric,
  overtime_pay numeric,
  gross_pay numeric,
  net_pay numeric,
  payment_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  target_worker_id uuid;
  start_date_parsed date;
  end_date_parsed date;
BEGIN
  -- Get current user role
  user_role := get_current_user_role();
  target_worker_id := COALESCE(p_worker_id, auth.uid());
  
  -- Parse dates
  start_date_parsed := COALESCE(p_start_date::date, CURRENT_DATE - INTERVAL '30 days');
  end_date_parsed := COALESCE(p_end_date::date, CURRENT_DATE);
  
  -- Enhanced rate limiting for payroll data access
  IF NOT check_rate_limit_enhanced('payroll_data_access', 10, 60) THEN
    PERFORM log_critical_security_event(
      'PAYROLL_DATA_RATE_LIMIT_EXCEEDED',
      'high',
      jsonb_build_object(
        'user_role', user_role,
        'target_worker_id', target_worker_id,
        'date_range', jsonb_build_object('start', start_date_parsed, 'end', end_date_parsed)
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for payroll data access';
  END IF;
  
  -- Security checks - only admins or the worker themselves can access payroll data
  IF user_role != 'admin' AND target_worker_id != auth.uid() THEN
    PERFORM log_critical_security_event(
      'UNAUTHORIZED_PAYROLL_ACCESS_ATTEMPT',
      'critical',
      jsonb_build_object(
        'target_worker_id', target_worker_id,
        'requesting_user', auth.uid(),
        'user_role', user_role
      )
    );
    RAISE EXCEPTION 'Access denied: can only access own payroll data unless admin';
  END IF;
  
  -- Log legitimate access
  PERFORM log_critical_security_event(
    'PAYROLL_DATA_SECURE_ACCESS',
    'medium',
    jsonb_build_object(
      'target_worker_id', target_worker_id,
      'user_role', user_role,
      'date_range', jsonb_build_object('start', start_date_parsed, 'end', end_date_parsed)
    )
  );
  
  -- Return payroll data
  RETURN QUERY
  SELECT 
    wp.worker_id,
    COALESCE(p.full_name, 'Unknown Worker') AS worker_name,
    wp.pay_period_start,
    wp.pay_period_end,
    wp.hours_worked,
    wp.regular_pay,
    wp.overtime_pay,
    wp.gross_pay,
    wp.net_pay,
    wp.status AS payment_status
  FROM public.worker_payments wp
  LEFT JOIN public.profiles p ON wp.worker_id = p.id
  WHERE 
    wp.worker_id = target_worker_id
    AND wp.pay_period_start >= start_date_parsed
    AND wp.pay_period_end <= end_date_parsed
  ORDER BY wp.pay_period_start DESC;
END;
$$;

-- Enhanced security alerts function
CREATE OR REPLACE FUNCTION public.get_security_alerts()
RETURNS TABLE(
  alert_id uuid,
  severity text,
  event_type text,
  user_id uuid,
  details jsonb,
  event_timestamp timestamp with time zone,
  ip_address text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get current user role
  user_role := get_current_user_role();
  
  -- Only admins can access security alerts
  IF user_role != 'admin' THEN
    PERFORM log_critical_security_event(
      'UNAUTHORIZED_SECURITY_ALERTS_ACCESS',
      'high',
      jsonb_build_object(
        'user_role', user_role,
        'requesting_user', auth.uid()
      )
    );
    RAISE EXCEPTION 'Access denied: only administrators can view security alerts';
  END IF;
  
  -- Log access to security alerts
  PERFORM log_critical_security_event(
    'SECURITY_ALERTS_ACCESS',
    'low',
    jsonb_build_object(
      'admin_user', auth.uid()
    )
  );
  
  -- Return security alerts from the last 30 days
  RETURN QUERY
  SELECT 
    sal.id AS alert_id,
    CASE 
      WHEN sal.action LIKE '%CRITICAL%' THEN 'critical'
      WHEN sal.action LIKE '%RATE_LIMIT%' THEN 'high'
      WHEN sal.action LIKE '%UNAUTHORIZED%' THEN 'high'
      WHEN sal.action LIKE '%SUSPICIOUS%' THEN 'medium'
      ELSE 'low'
    END AS severity,
    sal.action AS event_type,
    sal.user_id,
    sal.new_values AS details,
    sal.timestamp AS event_timestamp,
    sal.ip_address
  FROM public.security_audit_log sal
  WHERE sal.timestamp >= now() - INTERVAL '30 days'
    AND sal.action NOT IN ('SECURITY_ALERTS_ACCESS') -- Don't show access to this function
  ORDER BY sal.timestamp DESC
  LIMIT 1000;
END;
$$;

-- Create secure function to access phase costs data
CREATE OR REPLACE FUNCTION public.get_phase_costs_secure(
  p_project_id uuid DEFAULT NULL,
  p_phase_id uuid DEFAULT NULL
)
RETURNS TABLE(
  phase_id uuid,
  project_id uuid,
  phase_name text,
  budget numeric,
  material_cost numeric,
  labor_cost_planned numeric,
  labor_cost_actual numeric,
  expense_cost numeric,
  total_committed numeric,
  forecast numeric,
  variance numeric,
  last_updated timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  has_project_access boolean := false;
BEGIN
  -- Get current user role
  user_role := get_current_user_role();
  
  -- Enhanced rate limiting for phase costs access
  IF NOT check_rate_limit_enhanced('phase_costs_access', 50, 60) THEN
    PERFORM log_critical_security_event(
      'PHASE_COSTS_RATE_LIMIT_EXCEEDED',
      'medium',
      jsonb_build_object(
        'user_role', user_role,
        'project_id', p_project_id,
        'phase_id', p_phase_id
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for phase costs access';
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
      PERFORM log_critical_security_event(
        'UNAUTHORIZED_PHASE_COSTS_ACCESS',
        'high',
        jsonb_build_object(
          'project_id', p_project_id,
          'user_role', user_role,
          'requesting_user', auth.uid()
        )
      );
      RAISE EXCEPTION 'Access denied: insufficient project permissions for phase costs data';
    END IF;
  END IF;
  
  -- Log legitimate access
  PERFORM log_critical_security_event(
    'PHASE_COSTS_SECURE_ACCESS',
    'low',
    jsonb_build_object(
      'user_role', user_role,
      'project_id', p_project_id,
      'phase_id', p_phase_id,
      'has_project_access', has_project_access
    )
  );
  
  -- Return phase costs data with role-based filtering
  RETURN QUERY
  SELECT 
    pcv.phase_id,
    pcv.project_id,
    pcv.phase_name,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.budget
      ELSE NULL::numeric
    END AS budget,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.material_cost
      ELSE NULL::numeric
    END AS material_cost,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.labor_cost_planned
      ELSE NULL::numeric
    END AS labor_cost_planned,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.labor_cost_actual
      ELSE NULL::numeric
    END AS labor_cost_actual,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.expense_cost
      ELSE NULL::numeric
    END AS expense_cost,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.total_committed
      ELSE NULL::numeric
    END AS total_committed,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.forecast
      ELSE NULL::numeric
    END AS forecast,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.variance
      ELSE NULL::numeric
    END AS variance,
    pcv.last_updated
  FROM public.phase_costs_vw pcv
  WHERE 
    (user_role = 'admin' OR 
     EXISTS (
       SELECT 1 FROM user_project_role upr
       WHERE upr.user_id = auth.uid() 
       AND upr.project_id = pcv.project_id
       AND upr.role IN ('manager', 'admin')
     ))
    AND (p_project_id IS NULL OR pcv.project_id = p_project_id)
    AND (p_phase_id IS NULL OR pcv.phase_id = p_phase_id)
  ORDER BY pcv.phase_name;
END;
$$;