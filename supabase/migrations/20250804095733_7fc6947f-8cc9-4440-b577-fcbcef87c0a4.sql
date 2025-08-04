-- Add the missing updated_at column to time_sheets table
ALTER TABLE public.time_sheets ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update the trigger to use the correct function name
DROP TRIGGER IF EXISTS update_timesheet_updated_at_trigger ON public.time_sheets;

CREATE TRIGGER update_timesheet_updated_at_trigger
    BEFORE UPDATE ON public.time_sheets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_timesheet_updated_at();