-- Create worker payroll and cost management tables

-- Worker salary/hourly rate information
CREATE TABLE public.worker_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hourly_rate DECIMAL(10,2),
  monthly_salary DECIMAL(10,2),
  payment_type TEXT NOT NULL DEFAULT 'hourly' CHECK (payment_type IN ('hourly', 'salary', 'contract')),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Worker payment records
CREATE TABLE public.worker_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  hours_worked DECIMAL(8,2),
  overtime_hours DECIMAL(8,2) DEFAULT 0,
  regular_pay DECIMAL(10,2),
  overtime_pay DECIMAL(10,2) DEFAULT 0,
  bonuses DECIMAL(10,2) DEFAULT 0,
  deductions DECIMAL(10,2) DEFAULT 0,
  gross_pay DECIMAL(10,2),
  net_pay DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Worker expenses (for contract workers or reimbursements)
CREATE TABLE public.worker_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id),
  expense_type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE NOT NULL,
  receipt_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.worker_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for worker_rates
CREATE POLICY "Admins can manage all worker rates" ON public.worker_rates
FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "Workers can view their own rates" ON public.worker_rates
FOR SELECT USING (worker_id = auth.uid());

-- RLS Policies for worker_payments
CREATE POLICY "Admins can manage all worker payments" ON public.worker_payments
FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "Workers can view their own payments" ON public.worker_payments
FOR SELECT USING (worker_id = auth.uid());

-- RLS Policies for worker_expenses
CREATE POLICY "Admins can manage all worker expenses" ON public.worker_expenses
FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "Workers can manage their own expenses" ON public.worker_expenses
FOR ALL USING (worker_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_worker_rates_updated_at
BEFORE UPDATE ON public.worker_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_worker_payments_updated_at
BEFORE UPDATE ON public.worker_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_worker_expenses_updated_at
BEFORE UPDATE ON public.worker_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();