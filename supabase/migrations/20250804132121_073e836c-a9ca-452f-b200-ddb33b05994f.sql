-- Create shifts table for planned work assignments
CREATE TABLE public.shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'confirmed', 'rejected', 'completed')),
  confidence_score NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Add crew requirements to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS required_roles JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS crew_min INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS crew_max INTEGER;

-- Create optimization runs tracking table
CREATE TABLE public.optimization_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_date DATE NOT NULL,
  total_shifts_proposed INTEGER DEFAULT 0,
  total_shifts_confirmed INTEGER DEFAULT 0,
  optimization_score NUMERIC DEFAULT 0,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  auto_generated BOOLEAN DEFAULT false
);

-- Enable RLS on new tables
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_runs ENABLE ROW LEVEL SECURITY;

-- RLS policies for shifts
CREATE POLICY "Admins can manage all shifts" 
ON public.shifts FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Workers can view their own shifts" 
ON public.shifts FOR SELECT 
USING (worker_id = auth.uid());

CREATE POLICY "Workers can update their shift status" 
ON public.shifts FOR UPDATE 
USING (worker_id = auth.uid() AND status IN ('proposed', 'confirmed'));

-- RLS policies for optimization runs
CREATE POLICY "Admins can manage optimization runs" 
ON public.optimization_runs FOR ALL 
USING (get_current_user_role() = 'admin');

-- Create indexes for performance
CREATE INDEX idx_shifts_worker_date ON public.shifts (worker_id, start_time);
CREATE INDEX idx_shifts_task_id ON public.shifts (task_id);
CREATE INDEX idx_shifts_status ON public.shifts (status);
CREATE INDEX idx_optimization_runs_date ON public.optimization_runs (run_date);

-- Create function to prevent shift overlaps
CREATE OR REPLACE FUNCTION public.check_shift_overlap(
  p_worker_id UUID,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE,
  p_exclude_shift_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check for overlapping shifts for the same worker
  IF EXISTS (
    SELECT 1 
    FROM public.shifts 
    WHERE worker_id = p_worker_id 
      AND status IN ('confirmed', 'proposed')
      AND (p_exclude_shift_id IS NULL OR id != p_exclude_shift_id)
      AND (
        (start_time <= p_start_time AND end_time > p_start_time) OR
        (start_time < p_end_time AND end_time >= p_end_time) OR
        (start_time >= p_start_time AND end_time <= p_end_time)
      )
  ) THEN
    RETURN FALSE; -- Overlap found
  END IF;
  
  RETURN TRUE; -- No overlap
END;
$$;

-- Add trigger to update shifts updated_at
CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();