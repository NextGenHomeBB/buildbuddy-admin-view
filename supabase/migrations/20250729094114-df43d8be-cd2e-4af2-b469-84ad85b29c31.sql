-- Add foreign key relationship between worker_rates and profiles
ALTER TABLE public.worker_rates 
ADD CONSTRAINT fk_worker_rates_worker_id 
FOREIGN KEY (worker_id) REFERENCES public.profiles(id) 
ON DELETE CASCADE;