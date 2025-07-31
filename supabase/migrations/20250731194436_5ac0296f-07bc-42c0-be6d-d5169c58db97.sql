-- Add missing admin policies for worker availability management
CREATE POLICY "Admins can manage all worker availability" 
ON public.worker_availability 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage all worker date availability" 
ON public.worker_date_availability 
FOR ALL 
USING (get_current_user_role() = 'admin');