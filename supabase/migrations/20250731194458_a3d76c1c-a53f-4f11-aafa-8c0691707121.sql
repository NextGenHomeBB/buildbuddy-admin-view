-- Fix security definer function search path for worker availability trigger
DROP FUNCTION IF EXISTS public.update_worker_availability_updated_at();

CREATE OR REPLACE FUNCTION public.update_worker_availability_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;