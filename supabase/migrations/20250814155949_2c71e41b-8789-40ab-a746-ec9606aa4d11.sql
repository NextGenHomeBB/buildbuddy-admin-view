-- Fix SQL syntax error for worker rates policies

-- 1. Create enhanced worker rates security policies with correct syntax
CREATE POLICY "Secure worker rates access" ON public.worker_rates
FOR SELECT
TO authenticated  
USING (
  worker_id = auth.uid() OR
  public.get_current_user_role() = 'admin'
);

CREATE POLICY "Admin only worker rates insert" ON public.worker_rates
FOR INSERT
TO authenticated
WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Admin only worker rates update" ON public.worker_rates
FOR UPDATE
TO authenticated
USING (public.get_current_user_role() = 'admin')
WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Admin only worker rates delete" ON public.worker_rates
FOR DELETE
TO authenticated
USING (public.get_current_user_role() = 'admin');