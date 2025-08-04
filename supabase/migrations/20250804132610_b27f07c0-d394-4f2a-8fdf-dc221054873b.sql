-- Add foreign key constraint for worker_id to profiles table
ALTER TABLE public.shifts 
ADD CONSTRAINT shifts_worker_id_fkey 
FOREIGN KEY (worker_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;