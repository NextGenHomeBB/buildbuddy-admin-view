-- CRITICAL SECURITY FIX: Secure Customer Data Access
-- Issue: secure_customer_data view exposed without proper access controls

-- 1. Drop the existing insecure view
DROP VIEW IF EXISTS public.secure_customer_data;

-- 2. Create a secure function to replace the view
CREATE OR REPLACE FUNCTION public.get_secure_customer_data(
  p_project_id uuid DEFAULT NULL,
  p_document_type text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  document_number text,
  document_type text,
  status text,
  client_name text,
  client_email text,
  client_phone text,
  total_amount numeric,
  amount_paid numeric,
  project_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) AS $$
DECLARE
  user_role text;
BEGIN
  -- Get current user role securely
  user_role := get_current_user_role();
  
  -- Log this sensitive data access
  INSERT INTO public.security_audit_log (
    user_id, action, table_name,
    new_values, ip_address
  ) VALUES (
    auth.uid(), 
    'SECURE_CUSTOMER_DATA_ACCESS', 
    'customer_data_function',
    jsonb_build_object(
      'user_role', user_role,
      'project_filter', p_project_id,
      'document_type_filter', p_document_type,
      'access_time', now()
    ),
    inet_client_addr()::text
  );
  
  -- Only admins and authorized project users can access customer data
  IF NOT (
    user_role = 'admin' OR
    (p_project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = p_project_id
      AND upr.role IN ('manager', 'admin')
    ))
  ) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions to view customer data';
  END IF;
  
  -- Return data with appropriate masking based on role
  RETURN QUERY
  SELECT 
    d.id,
    d.document_number,
    d.document_type,
    d.status,
    CASE
      WHEN user_role = 'admin' THEN d.client_name
      ELSE concat(left(d.client_name, 3), '***')
    END AS client_name,
    CASE
      WHEN user_role = 'admin' THEN d.client_email
      ELSE concat(left(split_part(d.client_email, '@', 1), 2), '***@', split_part(d.client_email, '@', 2))
    END AS client_email,
    CASE
      WHEN user_role = 'admin' THEN d.client_phone
      ELSE concat('***', right(d.client_phone, 4))
    END AS client_phone,
    CASE
      WHEN user_role = ANY(ARRAY['admin', 'manager']) THEN d.total_amount
      ELSE NULL::numeric
    END AS total_amount,
    CASE
      WHEN user_role = ANY(ARRAY['admin', 'manager']) THEN d.amount_paid
      ELSE NULL::numeric
    END AS amount_paid,
    d.project_id,
    d.created_at,
    d.updated_at
  FROM documents d
  WHERE 
    -- Apply RLS-like filtering at function level
    (
      user_role = 'admin' OR
      d.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM user_project_role upr
        WHERE upr.user_id = auth.uid() 
        AND upr.project_id = d.project_id
        AND upr.role IN ('manager', 'admin')
      )
    )
    AND (p_project_id IS NULL OR d.project_id = p_project_id)
    AND (p_document_type IS NULL OR d.document_type = p_document_type)
  ORDER BY d.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 3. Create additional protection: Rate limiting for customer data access
CREATE OR REPLACE FUNCTION public.check_customer_data_rate_limit()
RETURNS boolean AS $$
BEGIN
  -- Enhanced rate limiting for sensitive customer data
  RETURN check_rate_limit_enhanced('customer_data_access', 10, 60); -- Max 10 requests per hour
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 4. Create comprehensive customer data protection function
CREATE OR REPLACE FUNCTION public.secure_customer_data_with_audit(
  p_project_id uuid DEFAULT NULL,
  p_document_type text DEFAULT NULL,
  p_access_reason text DEFAULT 'general_access'
)
RETURNS TABLE(
  id uuid,
  document_number text,
  document_type text,
  status text,
  client_name text,
  client_email text,
  client_phone text,
  total_amount numeric,
  amount_paid numeric,
  project_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) AS $$
BEGIN
  -- Check rate limits first
  IF NOT check_customer_data_rate_limit() THEN
    PERFORM log_critical_security_event(
      'CUSTOMER_DATA_RATE_LIMIT_EXCEEDED',
      'high',
      jsonb_build_object(
        'project_id', p_project_id,
        'document_type', p_document_type,
        'access_reason', p_access_reason
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for customer data access';
  END IF;
  
  -- Log high-priority access with detailed context
  PERFORM log_critical_security_event(
    'CUSTOMER_DATA_ACCESS_ATTEMPT',
    'medium',
    jsonb_build_object(
      'project_id', p_project_id,
      'document_type', p_document_type,
      'access_reason', p_access_reason,
      'user_role', get_current_user_role()
    )
  );
  
  -- Return securely filtered data
  RETURN QUERY
  SELECT * FROM get_secure_customer_data(p_project_id, p_document_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 5. Add trigger to monitor direct document access for customer data
CREATE OR REPLACE FUNCTION public.monitor_customer_data_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when customer-related fields are accessed
  IF TG_OP = 'SELECT' AND (
    NEW.client_email IS NOT NULL OR 
    NEW.client_phone IS NOT NULL OR 
    NEW.client_name IS NOT NULL
  ) THEN
    INSERT INTO public.security_audit_log (
      user_id, action, table_name, record_id,
      new_values, ip_address
    ) VALUES (
      auth.uid(), 'CUSTOMER_PII_ACCESS', 'documents', NEW.id,
      jsonb_build_object(
        'accessed_fields', ARRAY['client_name', 'client_email', 'client_phone'],
        'document_type', NEW.document_type,
        'access_method', 'direct_table_access'
      ),
      inet_client_addr()::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';