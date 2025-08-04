-- Set up scheduled optimization job to run weekdays at 5 AM
-- This will automatically generate shift proposals for the next day
SELECT cron.schedule(
  'daily-shift-optimization',
  '0 5 * * 1-5',  -- Every weekday at 5:00 AM
  $$
  SELECT net.http_post(
    url := 'https://ppsjrqfgsznnlojpyjvu.supabase.co/functions/v1/shift-optimize',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwc2pycWZnc3pubmxvanB5anZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA5Njc1OCwiZXhwIjoyMDY4NjcyNzU4fQ.tHMO-sM7mYP8FU3rBz91ORnpf_33wctNiF0fSXNxWIs"}'::jsonb,
    body := json_build_object(
      'date', (CURRENT_DATE + INTERVAL '1 day')::text,
      'auto_confirm', false
    )::jsonb
  ) as request_id;
  $$
);

-- Create notification table for planners
CREATE TABLE public.scheduler_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'shift_proposals',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications table
ALTER TABLE public.scheduler_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policy for notifications
CREATE POLICY "Users can manage their own notifications" 
ON public.scheduler_notifications FOR ALL 
USING (recipient_id = auth.uid());

-- Create function to notify admins when shifts are proposed
CREATE OR REPLACE FUNCTION public.notify_shift_proposals(proposal_count INTEGER, target_date DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_user RECORD;
BEGIN
  -- Notify all admin users
  FOR admin_user IN 
    SELECT DISTINCT ur.user_id 
    FROM public.user_roles ur 
    WHERE ur.role = 'admin'
  LOOP
    INSERT INTO public.scheduler_notifications (
      recipient_id,
      title,
      message,
      data
    ) VALUES (
      admin_user.user_id,
      'New Shift Proposals Available',
      format('%s shift proposals have been generated for %s. Please review and confirm.', 
             proposal_count, target_date::text),
      json_build_object(
        'proposal_count', proposal_count,
        'target_date', target_date,
        'action_url', '/admin/schedule/auto'
      )::jsonb
    );
  END LOOP;
END;
$$;