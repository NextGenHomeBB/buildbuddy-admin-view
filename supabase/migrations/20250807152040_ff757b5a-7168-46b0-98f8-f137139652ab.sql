-- Add Apple Calendar support to calendar_sync_settings table
ALTER TABLE public.calendar_sync_settings 
ADD COLUMN apple_enabled boolean DEFAULT false,
ADD COLUMN apple_calendar_url text,
ADD COLUMN apple_username text,
ADD COLUMN apple_calendar_id text;

-- Update calendar_events provider check to include 'apple'
ALTER TABLE public.calendar_events 
DROP CONSTRAINT IF EXISTS calendar_events_provider_check;

ALTER TABLE public.calendar_events 
ADD CONSTRAINT calendar_events_provider_check 
CHECK (provider IN ('google', 'outlook', 'apple', 'internal'));

-- Create Apple Calendar credentials table for secure storage
CREATE TABLE public.apple_calendar_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  app_password text NOT NULL,
  caldav_url text NOT NULL DEFAULT 'https://caldav.icloud.com/',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on apple_calendar_credentials
ALTER TABLE public.apple_calendar_credentials ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own credentials
CREATE POLICY "Users can manage their own Apple credentials"
ON public.apple_calendar_credentials
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_apple_credentials_updated_at
  BEFORE UPDATE ON public.apple_calendar_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();