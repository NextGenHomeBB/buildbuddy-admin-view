-- Fix foreign key constraints for shifts table
ALTER TABLE public.shifts 
ADD CONSTRAINT fk_shifts_worker_id 
FOREIGN KEY (worker_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.shifts 
ADD CONSTRAINT fk_shifts_task_id 
FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

ALTER TABLE public.shifts 
ADD CONSTRAINT fk_shifts_project_id 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;