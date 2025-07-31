-- Add new columns to time_sheets table for enhanced shift tracking
ALTER TABLE public.time_sheets 
ADD COLUMN IF NOT EXISTS break_duration numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS shift_type text DEFAULT 'regular',
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Add check constraint for shift types
ALTER TABLE public.time_sheets 
ADD CONSTRAINT check_shift_type 
CHECK (shift_type IN ('regular', 'overtime', 'weekend', 'holiday'));

-- Add trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_timesheet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_timesheet_updated_at_trigger
    BEFORE UPDATE ON public.time_sheets
    FOR EACH ROW
    EXECUTE FUNCTION update_timesheet_updated_at();

-- Update the auto_create_payment_from_shift function to handle new fields
CREATE OR REPLACE FUNCTION public.auto_create_payment_from_shift()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  worker_rate RECORD;
  calc_regular_hours NUMERIC := 0;
  calc_overtime_hours NUMERIC := 0;
  calc_regular_pay NUMERIC := 0;
  calc_overtime_pay NUMERIC := 0;
  calc_total_pay NUMERIC := 0;
  payment_record_id UUID;
  shift_multiplier NUMERIC := 1.0;
BEGIN
  -- Only process if we have actual hours worked
  IF NEW.hours IS NULL OR NEW.hours <= 0 THEN
    RETURN NEW;
  END IF;

  -- Get the current active rate for this worker
  SELECT * INTO worker_rate
  FROM public.worker_rates wr
  WHERE wr.worker_id = NEW.user_id
    AND wr.effective_date <= NEW.work_date
    AND (wr.end_date IS NULL OR wr.end_date >= NEW.work_date)
  ORDER BY wr.effective_date DESC
  LIMIT 1;

  -- If no rate found, skip payment creation
  IF worker_rate IS NULL THEN
    RETURN NEW;
  END IF;

  -- Apply shift type multipliers for special shifts
  CASE NEW.shift_type
    WHEN 'weekend' THEN shift_multiplier := 1.5;
    WHEN 'holiday' THEN shift_multiplier := 2.0;
    WHEN 'overtime' THEN shift_multiplier := 1.5;
    ELSE shift_multiplier := 1.0;
  END CASE;

  -- Calculate regular and overtime hours (over 8 hours = overtime)
  IF NEW.hours > 8 THEN
    calc_regular_hours := 8;
    calc_overtime_hours := NEW.hours - 8;
  ELSE
    calc_regular_hours := NEW.hours;
    calc_overtime_hours := 0;
  END IF;

  -- Calculate pay based on payment type
  IF worker_rate.payment_type = 'hourly' THEN
    calc_regular_pay := calc_regular_hours * worker_rate.hourly_rate * shift_multiplier;
    calc_overtime_pay := calc_overtime_hours * worker_rate.hourly_rate * 1.5 * shift_multiplier; -- 1.5x for overtime plus shift multiplier
    calc_total_pay := calc_regular_pay + calc_overtime_pay;
  ELSIF worker_rate.payment_type = 'salary' THEN
    -- For salary, we could calculate daily rate (monthly/30 or based on work days)
    calc_regular_pay := worker_rate.monthly_salary / 30 * shift_multiplier; -- Simple daily rate with shift multiplier
    calc_overtime_pay := 0; -- Typically no overtime for salary
    calc_total_pay := calc_regular_pay;
  END IF;

  -- Create or update payment record for this period
  -- First, check if a payment already exists for this worker and date
  SELECT id INTO payment_record_id
  FROM public.worker_payments
  WHERE worker_id = NEW.user_id
    AND pay_period_start <= NEW.work_date
    AND pay_period_end >= NEW.work_date
    AND status = 'pending'; -- Only update pending payments

  IF payment_record_id IS NOT NULL THEN
    -- Update existing payment record
    UPDATE public.worker_payments
    SET 
      hours_worked = COALESCE(hours_worked, 0) + NEW.hours,
      regular_pay = COALESCE(worker_payments.regular_pay, 0) + calc_regular_pay,
      overtime_hours = COALESCE(worker_payments.overtime_hours, 0) + calc_overtime_hours,
      overtime_pay = COALESCE(worker_payments.overtime_pay, 0) + calc_overtime_pay,
      gross_pay = COALESCE(worker_payments.gross_pay, 0) + calc_total_pay,
      net_pay = COALESCE(worker_payments.gross_pay, 0) + calc_total_pay - COALESCE(deductions, 0),
      updated_at = NOW()
    WHERE id = payment_record_id;
  ELSE
    -- Create new payment record for this week
    INSERT INTO public.worker_payments (
      worker_id,
      pay_period_start,
      pay_period_end,
      hours_worked,
      regular_pay,
      overtime_hours,
      overtime_pay,
      gross_pay,
      net_pay,
      status,
      notes
    ) VALUES (
      NEW.user_id,
      DATE_TRUNC('week', NEW.work_date)::date, -- Start of week
      (DATE_TRUNC('week', NEW.work_date) + INTERVAL '6 days')::date, -- End of week
      NEW.hours,
      calc_regular_pay,
      calc_overtime_hours,
      calc_overtime_pay,
      calc_total_pay,
      calc_total_pay, -- Net pay same as gross for now
      'pending',
      'Auto-generated from ' || COALESCE(NEW.shift_type, 'regular') || ' shift on ' || NEW.work_date::text
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Create indexes for better performance on new columns
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