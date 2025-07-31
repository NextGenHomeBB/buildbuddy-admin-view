-- Add new columns to time_sheets table for enhanced shift tracking (skip if exists)
DO $$ 
BEGIN
    -- Add break_duration column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'time_sheets' AND column_name = 'break_duration') THEN
        ALTER TABLE public.time_sheets ADD COLUMN break_duration numeric DEFAULT 0;
    END IF;
    
    -- Add shift_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'time_sheets' AND column_name = 'shift_type') THEN
        ALTER TABLE public.time_sheets ADD COLUMN shift_type text DEFAULT 'regular';
    END IF;
    
    -- Add location column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'time_sheets' AND column_name = 'location') THEN
        ALTER TABLE public.time_sheets ADD COLUMN location text;
    END IF;
END $$;

-- Add check constraint for shift types if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'check_shift_type') THEN
        ALTER TABLE public.time_sheets 
        ADD CONSTRAINT check_shift_type 
        CHECK (shift_type IN ('regular', 'overtime', 'weekend', 'holiday'));
    END IF;
END $$;

-- Create indexes for better performance on new columns (skip if exists)
CREATE INDEX IF NOT EXISTS idx_time_sheets_shift_type ON public.time_sheets(shift_type);
CREATE INDEX IF NOT EXISTS idx_time_sheets_work_date_user ON public.time_sheets(work_date, user_id);

-- Add helpful comments
COMMENT ON COLUMN public.time_sheets.break_duration IS 'Total break time in minutes deducted from work hours';
COMMENT ON COLUMN public.time_sheets.shift_type IS 'Type of shift: regular, overtime, weekend, holiday';
COMMENT ON COLUMN public.time_sheets.location IS 'Work location or GPS coordinates (optional)';

-- Create a view for real-time shift monitoring (admin use)
CREATE OR REPLACE VIEW public.active_shifts AS
SELECT 
  ts.user_id as worker_id,
  p.full_name as worker_name,
  p.avatar_url as worker_avatar,
  proj.name as project_name,
  ts.created_at as shift_start,
  ts.break_duration,
  ts.shift_type,
  wr.hourly_rate,
  wr.payment_type,
  ts.work_date,
  ts.hours as recorded_hours,
  ts.note
FROM public.time_sheets ts
LEFT JOIN public.profiles p ON p.id = ts.user_id
LEFT JOIN public.projects proj ON proj.id = ts.project_id
LEFT JOIN public.worker_rates wr ON wr.worker_id = ts.user_id 
  AND wr.effective_date <= ts.work_date
  AND (wr.end_date IS NULL OR wr.end_date >= ts.work_date)
WHERE ts.work_date = CURRENT_DATE
ORDER BY ts.created_at DESC;

-- Grant appropriate permissions
GRANT SELECT ON public.active_shifts TO authenticated;