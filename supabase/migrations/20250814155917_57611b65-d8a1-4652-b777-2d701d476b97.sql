-- Phase 3: Address remaining security warnings

-- 1. Fix search_path for all remaining functions
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
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

-- 2. Disable direct access to materialized views by removing from API
ALTER TABLE project_costs_vw SET (security_invoker = on);
ALTER TABLE security_metrics_summary SET (security_invoker = on);

-- 3. Create blocking policies for materialized views to force RPC usage
CREATE POLICY "Force RPC usage for project_costs_vw" ON project_costs_vw
FOR ALL TO authenticated, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Force RPC usage for security_metrics_summary" ON security_metrics_summary  
FOR ALL TO authenticated, anon
USING (false)
WITH CHECK (false);

-- 4. Enable RLS on materialized views
ALTER TABLE project_costs_vw ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_metrics_summary ENABLE ROW LEVEL SECURITY;

-- 5. Create function to check HR administrator access
CREATE OR REPLACE FUNCTION public.is_hr_administrator()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN public.get_current_user_role() = 'admin';
END;
$$;

-- 6. Recreate simplified profile access policy
CREATE POLICY "Secure profile access" ON public.profiles
FOR SELECT 
TO authenticated
USING (
  id = auth.uid() OR 
  public.is_hr_administrator()
);

-- 7. Create enhanced Apple credential security policies
CREATE POLICY "Admin only apple credential management" ON public.apple_calendar_credentials
FOR ALL 
TO authenticated
USING (
  user_id = auth.uid() OR 
  public.get_current_user_role() = 'admin'
)
WITH CHECK (
  user_id = auth.uid() OR 
  public.get_current_user_role() = 'admin'
);

-- 8. Create enhanced worker rates security policies  
CREATE POLICY "Secure worker rates access" ON public.worker_rates
FOR SELECT
TO authenticated  
USING (
  worker_id = auth.uid() OR
  public.get_current_user_role() = 'admin'
);

CREATE POLICY "Admin only worker rates management" ON public.worker_rates
FOR INSERT, UPDATE, DELETE
TO authenticated
USING (public.get_current_user_role() = 'admin')
WITH CHECK (public.get_current_user_role() = 'admin');