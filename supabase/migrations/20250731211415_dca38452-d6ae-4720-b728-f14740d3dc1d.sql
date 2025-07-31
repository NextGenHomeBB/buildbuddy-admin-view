-- Drop the existing view if it exists
DROP VIEW IF EXISTS public.active_shifts;

-- Create active_shifts table for tracking ongoing shifts
CREATE TABLE public.active_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL,
  project_id UUID,
  shift_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  shift_type TEXT DEFAULT 'regular',
  break_start TIMESTAMP WITH TIME ZONE,
  total_break_duration NUMERIC DEFAULT 0, -- in minutes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.active_shifts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Workers can view their own active shifts" 
ON public.active_shifts 
FOR SELECT 
USING (worker_id = auth.uid());

CREATE POLICY "Workers can manage their own active shifts" 
ON public.active_shifts 
FOR ALL 
USING (worker_id = auth.uid())
WITH CHECK (worker_id = auth.uid());

CREATE POLICY "Admins can view all active shifts" 
ON public.active_shifts 
FOR SELECT 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage all active shifts" 
ON public.active_shifts 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Create trigger for updated_at
CREATE TRIGGER update_active_shifts_updated_at
BEFORE UPDATE ON public.active_shifts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER TABLE public.active_shifts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_shifts;