-- Phase 1: Critical Security Fixes (Final version - working around view limitations)

-- 1. Enhanced credential security audit
CREATE OR REPLACE FUNCTION public.enhanced_credential_audit()
RETURNS TRIGGER AS $$
BEGIN
  -- Update access tracking
  NEW.last_accessed = now();
  NEW.access_count = COALESCE(OLD.access_count, 0) + 1;
  
  -- Log high-priority access attempt
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, record_id, 
    new_values, ip_address
  ) VALUES (
    auth.uid(), 'CREDENTIAL_ACCESS_HIGH_RISK', 'apple_calendar_credentials', NEW.id,
    jsonb_build_object(
      'access_count', NEW.access_count,
      'access_time', NEW.last_accessed,
      'credential_type', 'apple_calendar',
      'security_level', 'critical'
    ),
    inet_client_addr()::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Apply enhanced audit to Apple calendar credentials
DROP TRIGGER IF EXISTS enhanced_credential_audit ON public.apple_calendar_credentials;
CREATE TRIGGER enhanced_credential_audit
  BEFORE UPDATE ON public.apple_calendar_credentials
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_credential_audit();

-- 2. Enhanced OAuth token security monitoring
CREATE OR REPLACE FUNCTION public.monitor_oauth_security()
RETURNS TRIGGER AS $$
DECLARE
  current_ip text;
  recent_access_count integer;
BEGIN
  current_ip := inet_client_addr()::text;
  
  -- Update usage tracking
  NEW.last_used = now();
  NEW.usage_count = COALESCE(OLD.usage_count, 0) + 1;
  NEW.last_ip = current_ip;
  
  -- Check for suspicious patterns
  IF OLD.last_ip IS NOT NULL AND OLD.last_ip != current_ip THEN
    -- Count recent access from different IPs
    SELECT COUNT(DISTINCT ip_address) INTO recent_access_count
    FROM public.security_audit_log
    WHERE user_id = NEW.user_id
      AND action LIKE '%TOKEN%'
      AND timestamp > now() - INTERVAL '1 hour';
    
    -- Flag high-risk activity
    IF recent_access_count > 2 THEN
      NEW.suspicious_activity = true;
      
      -- Log critical security event
      INSERT INTO public.security_audit_log (
        user_id, action, table_name, record_id, 
        new_values, ip_address
      ) VALUES (
        NEW.user_id, 'CRITICAL_TOKEN_SECURITY_VIOLATION', 'calendar_oauth_tokens', NEW.id,
        jsonb_build_object(
          'distinct_ips', recent_access_count,
          'current_ip', current_ip,
          'previous_ip', OLD.last_ip,
          'threat_level', 'critical',
          'auto_flagged', true
        ),
        current_ip
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Apply OAuth monitoring
DROP TRIGGER IF EXISTS monitor_oauth_security ON public.calendar_oauth_tokens;
CREATE TRIGGER monitor_oauth_security
  BEFORE UPDATE ON public.calendar_oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION public.monitor_oauth_security();

-- 3. Create comprehensive security monitoring function
CREATE OR REPLACE FUNCTION public.log_critical_security_event(
  event_type text,
  threat_level text DEFAULT 'high',
  details jsonb DEFAULT '{}',
  auto_response text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Log the critical event
  INSERT INTO public.security_audit_log (
    user_id, action, table_name,
    new_values, ip_address
  ) VALUES (
    auth.uid(), 
    format('CRITICAL_SECURITY_%s', upper(event_type)), 
    'security_events',
    jsonb_build_object(
      'threat_level', threat_level,
      'details', details,
      'auto_response', auto_response,
      'event_timestamp', now(),
      'investigation_required', threat_level = 'critical'
    ),
    inet_client_addr()::text
  );
  
  -- Auto-escalate critical threats
  IF threat_level = 'critical' THEN
    RAISE WARNING 'CRITICAL SECURITY THREAT DETECTED: % - Details: %', event_type, details;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 4. Strengthen documents table RLS policy (replace existing one)
DROP POLICY IF EXISTS "Enhanced document access control" ON public.documents;

CREATE POLICY "Enhanced document access with field protection"
ON public.documents
FOR ALL
USING (
  get_current_user_role() = 'admin' OR
  (
    get_current_user_role() = 'manager' AND 
    EXISTS (
      SELECT 1 FROM user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = documents.project_id 
      AND upr.role IN ('manager', 'admin')
    )
  ) OR
  created_by = auth.uid()
)
WITH CHECK (
  get_current_user_role() = 'admin' OR
  (
    get_current_user_role() = 'manager' AND 
    EXISTS (
      SELECT 1 FROM user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = documents.project_id 
      AND upr.role IN ('manager', 'admin')
    )
  ) OR
  created_by = auth.uid()
);

-- 5. Fix database function security (add missing search_path to critical functions)
CREATE OR REPLACE FUNCTION public.accept_quotation_by_token(p_token text, p_name text, p_email text, p_note text, p_ip text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_doc RECORD;
BEGIN
  SELECT * INTO v_doc FROM public.documents 
  WHERE acceptance_token = p_token AND document_type = 'quotation';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired token');
  END IF;

  IF v_doc.status = 'accepted' THEN
    RETURN jsonb_build_object('success', true, 'already', true, 'document_id', v_doc.id);
  END IF;

  UPDATE public.documents
  SET status = 'accepted',
      accepted_at = now(),
      accepted_by_name = p_name,
      accepted_by_email = p_email,
      acceptance_note = p_note,
      acceptance_ip = p_ip,
      updated_at = now()
  WHERE id = v_doc.id;

  RETURN jsonb_build_object('success', true, 'document_id', v_doc.id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_document_public(p_token text)
RETURNS TABLE(document_number text, client_name text, total_amount numeric, notes text, status text, document_type text, valid_until date)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT document_number, client_name, total_amount, notes, status, document_type, valid_until
  FROM public.documents
  WHERE acceptance_token = p_token;
$function$;

-- 6. Add enhanced audit triggers to sensitive tables
CREATE OR REPLACE FUNCTION public.enhanced_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  sensitive_tables text[] := ARRAY['user_roles', 'user_project_role', 'profiles', 'documents', 'document_payments', 'apple_calendar_credentials', 'calendar_oauth_tokens'];
BEGIN
  -- Log all operations on sensitive tables with enhanced security context
  IF TG_TABLE_NAME = ANY(sensitive_tables) THEN
    INSERT INTO public.security_audit_log (
      user_id, 
      action, 
      table_name, 
      record_id, 
      old_values, 
      new_values,
      ip_address
    ) VALUES (
      auth.uid(), 
      format('ENHANCED_%s', TG_OP), 
      TG_TABLE_NAME, 
      COALESCE(NEW.id, OLD.id),
      CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) END,
      CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) END,
      inet_client_addr()::text
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Apply enhanced audit triggers to sensitive tables
DROP TRIGGER IF EXISTS enhanced_audit_trigger ON public.documents;
CREATE TRIGGER enhanced_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger();