-- Add foreign key relationships for worker_payments and worker_expenses
ALTER TABLE public.worker_payments 
ADD CONSTRAINT fk_worker_payments_worker_id 
FOREIGN KEY (worker_id) REFERENCES public.profiles(id) 
ON DELETE CASCADE;

ALTER TABLE public.worker_expenses 
ADD CONSTRAINT fk_worker_expenses_worker_id 
FOREIGN KEY (worker_id) REFERENCES public.profiles(id) 
ON DELETE CASCADE;