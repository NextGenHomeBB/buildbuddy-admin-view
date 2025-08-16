-- Phase 2: Enhanced Credential Protection

-- 1. Complete credential encryption migration
-- Add columns for encrypted credential storage and key management
ALTER TABLE public.apple_calendar_credentials 
ADD COLUMN IF NOT EXISTS encrypted_app_password text,
ADD COLUMN IF NOT EXISTS encryption_version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS key_derivation_salt text,
ADD COLUMN IF NOT EXISTS credential_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_rotation_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS rotation_required boolean DEFAULT false;

-- Add columns for OAuth token security
ALTER TABLE public.calendar_oauth_tokens
ADD COLUMN IF NOT EXISTS token_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_rotation_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS rotation_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS token_hash text,
ADD COLUMN IF NOT EXISTS access_level text DEFAULT 'standard';

-- 2. Create credential access monitoring table for detailed tracking
CREATE TABLE IF NOT EXISTS public.credential_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  credential_type text NOT NULL, -- 'apple_calendar', 'oauth_token', etc.
  credential_id uuid NOT NULL,
  access_type text NOT NULL, -- 'READ', 'CREATE', 'UPDATE', 'DELETE'
  access_reason text, -- 'calendar_sync', 'credential_update', etc.
  ip_address text,
  user_agent text,
  session_id text,
  risk_score integer DEFAULT 0, -- 0-100 risk assessment
  access_granted boolean DEFAULT true,
  failure_reason text,
  timestamp timestamp with time zone DEFAULT now(),
  additional_context jsonb DEFAULT '{}'
);

ALTER TABLE public.credential_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all credential access logs" 
ON public.credential_access_log 
FOR SELECT 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Users can view their own credential access logs" 
ON public.credential_access_log 
FOR SELECT 
USING (user_id = auth.uid());

-- System can insert access logs
CREATE POLICY "System can insert credential access logs" 
ON public.credential_access_log 
FOR INSERT 
WITH CHECK (true);

-- 3. Create credential rotation policies table
CREATE TABLE IF NOT EXISTS public.credential_rotation_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_type text NOT NULL UNIQUE,
  max_age_days integer NOT NULL DEFAULT 90,
  warning_days_before_expiry integer DEFAULT 7,
  auto_rotation_enabled boolean DEFAULT false,
  mandatory_rotation boolean DEFAULT true,
  risk_based_rotation boolean DEFAULT true,
  max_failed_attempts integer DEFAULT 5,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.credential_rotation_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only credential rotation policies" 
ON public.credential_rotation_policies 
FOR ALL 
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

-- Insert default rotation policies
INSERT INTO public.credential_rotation_policies (credential_type, max_age_days, warning_days_before_expiry, mandatory_rotation) VALUES
('apple_calendar', 90, 7, true),
('oauth_token', 60, 5, true),
('api_key', 45, 3, true)
ON CONFLICT (credential_type) DO NOTHING;

-- 4. Enhanced credential access monitoring function
CREATE OR REPLACE FUNCTION public.log_credential_access(
  p_credential_type text,
  p_credential_id uuid,
  p_access_type text,
  p_access_reason text DEFAULT NULL,
  p_additional_context jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  access_log_id uuid;
  current_ip text;
  current_user_agent text;
  risk_score integer := 0;
  recent_failed_attempts integer;
BEGIN
  -- Get current request context
  current_ip := inet_client_addr()::text;
  current_user_agent := current_setting('request.headers', true)::json->>'user-agent';
  
  -- Calculate risk score based on various factors
  -- Check for recent failed access attempts
  SELECT COUNT(*) INTO recent_failed_attempts
  FROM public.credential_access_log
  WHERE user_id = auth.uid()
    AND credential_type = p_credential_type
    AND access_granted = false
    AND timestamp > now() - INTERVAL '1 hour';
  
  -- Increase risk score based on failed attempts
  risk_score := risk_score + (recent_failed_attempts * 10);
  
  -- Check for unusual access patterns (different IP)
  IF EXISTS (
    SELECT 1 FROM public.credential_access_log
    WHERE user_id = auth.uid()
      AND credential_type = p_credential_type
      AND ip_address != current_ip
      AND timestamp > now() - INTERVAL '24 hours'
    LIMIT 1
  ) THEN
    risk_score := risk_score + 20;
  END IF;
  
  -- Check for high-frequency access
  IF (
    SELECT COUNT(*) FROM public.credential_access_log
    WHERE user_id = auth.uid()
      AND credential_type = p_credential_type
      AND timestamp > now() - INTERVAL '1 hour'
  ) > 10 THEN
    risk_score := risk_score + 15;
  END IF;
  
  -- Insert access log
  INSERT INTO public.credential_access_log (
    user_id,
    credential_type,
    credential_id,
    access_type,
    access_reason,
    ip_address,
    user_agent,
    risk_score,
    access_granted,
    additional_context
  ) VALUES (
    auth.uid(),
    p_credential_type,
    p_credential_id,
    p_access_type,
    p_access_reason,
    current_ip,
    current_user_agent,
    risk_score,
    true,
    p_additional_context
  ) RETURNING id INTO access_log_id;
  
  -- Log high-risk access attempts
  IF risk_score > 30 THEN
    PERFORM log_critical_security_event(
      'HIGH_RISK_CREDENTIAL_ACCESS',
      'high',
      jsonb_build_object(
        'credential_type', p_credential_type,
        'risk_score', risk_score,
        'access_type', p_access_type,
        'recent_failed_attempts', recent_failed_attempts
      )
    );
  END IF;
  
  RETURN access_log_id;
END;
$function$;

-- 5. Credential rotation check function
CREATE OR REPLACE FUNCTION public.check_credential_rotation_required(
  p_credential_type text,
  p_credential_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  policy_record public.credential_rotation_policies%ROWTYPE;
  credential_age_days integer;
  requires_rotation boolean := false;
  rotation_reason text[];
  warning_only boolean := false;
BEGIN
  -- Get rotation policy for this credential type
  SELECT * INTO policy_record
  FROM public.credential_rotation_policies
  WHERE credential_type = p_credential_type;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'requires_rotation', false,
      'reason', 'No rotation policy defined'
    );
  END IF;
  
  -- Check credential age based on type
  IF p_credential_type = 'apple_calendar' THEN
    SELECT EXTRACT(DAY FROM now() - last_rotation_at) INTO credential_age_days
    FROM public.apple_calendar_credentials
    WHERE id = p_credential_id;
  ELSIF p_credential_type = 'oauth_token' THEN
    SELECT EXTRACT(DAY FROM now() - last_rotation_at) INTO credential_age_days
    FROM public.calendar_oauth_tokens
    WHERE id = p_credential_id;
  END IF;
  
  IF credential_age_days IS NULL THEN
    RETURN jsonb_build_object(
      'requires_rotation', false,
      'reason', 'Credential not found'
    );
  END IF;
  
  -- Check if rotation is required
  IF policy_record.mandatory_rotation AND credential_age_days >= policy_record.max_age_days THEN
    requires_rotation := true;
    rotation_reason := array_append(rotation_reason, 'Credential expired (age: ' || credential_age_days || ' days)');
  ELSIF credential_age_days >= (policy_record.max_age_days - policy_record.warning_days_before_expiry) THEN
    warning_only := true;
    rotation_reason := array_append(rotation_reason, 'Credential approaching expiry');
  END IF;
  
  -- Check for risk-based rotation triggers
  IF policy_record.risk_based_rotation THEN
    -- Check for recent high-risk access
    IF EXISTS (
      SELECT 1 FROM public.credential_access_log
      WHERE credential_id = p_credential_id
        AND risk_score > 50
        AND timestamp > now() - INTERVAL '24 hours'
    ) THEN
      requires_rotation := true;
      rotation_reason := array_append(rotation_reason, 'High-risk access detected');
    END IF;
    
    -- Check for multiple failed access attempts
    IF (
      SELECT COUNT(*) FROM public.credential_access_log
      WHERE credential_id = p_credential_id
        AND access_granted = false
        AND timestamp > now() - INTERVAL '1 hour'
    ) >= policy_record.max_failed_attempts THEN
      requires_rotation := true;
      rotation_reason := array_append(rotation_reason, 'Multiple failed access attempts');
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'requires_rotation', requires_rotation,
    'warning_only', warning_only,
    'credential_age_days', credential_age_days,
    'max_age_days', policy_record.max_age_days,
    'reasons', rotation_reason,
    'policy', row_to_json(policy_record)
  );
END;
$function$;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credential_access_log_user_type_time 
ON public.credential_access_log (user_id, credential_type, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_credential_access_log_risk_score 
ON public.credential_access_log (risk_score DESC, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_apple_credentials_rotation 
ON public.apple_calendar_credentials (last_rotation_at, rotation_required);

CREATE INDEX IF NOT EXISTS idx_oauth_tokens_rotation 
ON public.calendar_oauth_tokens (last_rotation_at, rotation_required);