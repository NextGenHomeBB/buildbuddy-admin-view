-- Add calendar scheduling columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN start_date date,
ADD COLUMN end_date date,
ADD COLUMN duration_days integer,
ADD COLUMN is_scheduled boolean DEFAULT false;

-- Add estimated days to project_phases table
ALTER TABLE public.project_phases 
ADD COLUMN estimated_days integer;

-- Create index for calendar queries
CREATE INDEX idx_tasks_calendar_dates ON public.tasks(start_date, end_date) WHERE is_scheduled = true;
CREATE INDEX idx_tasks_assignee_dates ON public.tasks(assignee, start_date, end_date) WHERE is_scheduled = true;