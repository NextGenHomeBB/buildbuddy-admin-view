-- Add sync status columns to time_sheets table for external system integration
ALTER TABLE public.time_sheets 
ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
ADD COLUMN IF NOT EXISTS sync_error text,
ADD COLUMN IF NOT EXISTS synced_at timestamp with time zone;

-- Create index for better performance on sync status queries
CREATE INDEX IF NOT EXISTS idx_time_sheets_sync_status ON public.time_sheets(sync_status);
CREATE INDEX IF NOT EXISTS idx_time_sheets_project_user ON public.time_sheets(project_id, user_id);

-- Create function to automatically set sync status on insert
CREATE OR REPLACE FUNCTION public.handle_new_timesheet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Set initial sync status
  NEW.sync_status = 'pending';
  NEW.synced_at = NULL;
  NEW.sync_error = NULL;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new timesheet entries
DROP TRIGGER IF EXISTS on_timesheet_created ON public.time_sheets;
CREATE TRIGGER on_timesheet_created
  BEFORE INSERT ON public.time_sheets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_timesheet();

-- Update existing time_sheets to have pending sync status
UPDATE public.time_sheets 
SET sync_status = 'pending' 
WHERE sync_status IS NULL;