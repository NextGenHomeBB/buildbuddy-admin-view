-- Create calendar_events table for two-way sync
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,
  location TEXT,
  
  -- External calendar integration
  external_id TEXT,
  provider TEXT CHECK (provider IN ('google', 'outlook', 'internal')),
  
  -- Sync management
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error')),
  last_synced TIMESTAMP WITH TIME ZONE,
  sync_error TEXT,
  
  -- Task relationship (optional)
  task_id UUID,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create calendar_sync_settings table for user preferences
CREATE TABLE IF NOT EXISTS public.calendar_sync_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  
  -- Provider settings
  google_enabled BOOLEAN DEFAULT false,
  outlook_enabled BOOLEAN DEFAULT false,
  
  -- Sync preferences
  sync_direction TEXT DEFAULT 'bidirectional' CHECK (sync_direction IN ('import_only', 'export_only', 'bidirectional')),
  auto_sync_enabled BOOLEAN DEFAULT true,
  sync_interval_minutes INTEGER DEFAULT 5,
  
  -- Calendar selection
  google_calendar_id TEXT,
  outlook_calendar_id TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create calendar_oauth_tokens table for storing refresh tokens
CREATE TABLE IF NOT EXISTS public.calendar_oauth_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook')),
  
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_sync_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_events
CREATE POLICY "Users can manage their own calendar events"
ON public.calendar_events
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all calendar events"
ON public.calendar_events
FOR SELECT
USING (get_current_user_role() = 'admin');

-- RLS Policies for calendar_sync_settings
CREATE POLICY "Users can manage their own sync settings"
ON public.calendar_sync_settings
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS Policies for calendar_oauth_tokens
CREATE POLICY "Users can manage their own oauth tokens"
ON public.calendar_oauth_tokens
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_starts_at ON public.calendar_events(starts_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_provider_external_id ON public.calendar_events(provider, external_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_sync_status ON public.calendar_events(sync_status);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.update_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_calendar_updated_at();

CREATE TRIGGER update_calendar_sync_settings_updated_at
  BEFORE UPDATE ON public.calendar_sync_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_calendar_updated_at();

CREATE TRIGGER update_calendar_oauth_tokens_updated_at
  BEFORE UPDATE ON public.calendar_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_calendar_updated_at();