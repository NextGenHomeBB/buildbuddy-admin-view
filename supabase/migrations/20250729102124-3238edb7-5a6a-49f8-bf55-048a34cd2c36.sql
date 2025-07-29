-- Fix ambiguous column reference in auto_create_payment_from_shift trigger
-- Replace the function with proper variable naming to avoid conflicts

CREATE OR REPLACE FUNCTION public.auto_create_payment_from_shift()
RETURNS TRIGGER AS $$
DECLARE
  worker_rate RECORD;
  calc_regular_hours NUMERIC := 0;
  calc_overtime_hours NUMERIC := 0;
  calc_regular_pay NUMERIC := 0;
  calc_overtime_pay NUMERIC := 0;
  calc_total_pay NUMERIC := 0;
  payment_record_id UUID;
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
    calc_regular_pay := calc_regular_hours * worker_rate.hourly_rate;
    calc_overtime_pay := calc_overtime_hours * worker_rate.hourly_rate * 1.5; -- 1.5x for overtime
    calc_total_pay := calc_regular_pay + calc_overtime_pay;
  ELSIF worker_rate.payment_type = 'salary' THEN
    -- For salary, we could calculate daily rate (monthly/30 or based on work days)
    calc_regular_pay := worker_rate.monthly_salary / 30; -- Simple daily rate
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
      'Auto-generated from shift on ' || NEW.work_date::text
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;