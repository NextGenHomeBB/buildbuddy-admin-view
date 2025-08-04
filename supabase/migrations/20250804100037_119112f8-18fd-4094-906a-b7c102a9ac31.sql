-- Change default approval status to approved for automatic time tracking
ALTER TABLE public.time_sheets ALTER COLUMN approval_status SET DEFAULT 'approved';

-- Update existing pending timesheets to approved for automatic system
UPDATE public.time_sheets 
SET approval_status = 'approved', 
    approved_at = created_at,
    updated_at = NOW()
WHERE approval_status = 'pending';