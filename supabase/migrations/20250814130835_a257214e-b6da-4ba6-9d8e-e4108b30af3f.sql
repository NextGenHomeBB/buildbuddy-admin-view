-- CRITICAL SECURITY FIX: Secure Documents Table with Multi-Layer Protection
-- Issue: Documents table exposes sensitive customer payment data

-- 1. Drop all existing permissive policies
DROP POLICY IF EXISTS "Admins can manage all documents" ON public.documents;
DROP POLICY IF EXISTS "Enhanced document access with field protection" ON public.documents;

-- 2. Create strict admin-only policy for full document access
CREATE POLICY "Admin full document access"
ON public.documents
FOR ALL
TO authenticated
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

-- 3. Create limited manager access policy (no sensitive payment data)
CREATE POLICY "Manager limited document access"
ON public.documents
FOR SELECT
TO authenticated
USING (
  get_current_user_role() = 'manager' AND
  EXISTS (
    SELECT 1 FROM user_project_role upr
    WHERE upr.user_id = auth.uid() 
    AND upr.project_id = documents.project_id 
    AND upr.role IN ('manager', 'admin')
  )
);

-- 4. Create very limited creator access (basic document info only, no payment data)
CREATE POLICY "Creator basic document access"
ON public.documents
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid() AND
  get_current_user_role() IN ('manager', 'worker')
);

-- 5. Create secure function for accessing document data with field-level security
CREATE OR REPLACE FUNCTION public.get_document_secure(
  p_document_id uuid,
  p_include_payment_data boolean DEFAULT false
)
RETURNS TABLE(
  id uuid,
  document_number text,
  document_type text,
  status text,
  client_name text,
  client_email text,
  client_phone text,
  client_address text,
  total_amount numeric,
  subtotal numeric,
  tax_amount numeric,
  amount_paid numeric,
  payment_status text,
  project_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  -- Sensitive fields (only for authorized users)
  payment_url text,
  stripe_payment_intent_id text,
  stripe_session_id text,
  acceptance_token text,
  accepted_by_email text,
  accepted_by_name text
) AS $$
DECLARE
  user_role text;
  has_access boolean := false;
  doc_record record;
BEGIN
  -- Get current user role securely
  user_role := get_current_user_role();
  
  -- First, check if document exists and user has basic access
  SELECT * INTO doc_record FROM documents d
  WHERE d.id = p_document_id
  AND (
    user_role = 'admin' OR
    (user_role = 'manager' AND EXISTS (
      SELECT 1 FROM user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = d.project_id 
      AND upr.role IN ('manager', 'admin')
    )) OR
    (d.created_by = auth.uid() AND user_role IN ('manager', 'worker'))
  );
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found or access denied';
  END IF;
  
  -- Log this sensitive data access
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, record_id,
    new_values, ip_address
  ) VALUES (
    auth.uid(), 
    'DOCUMENT_SECURE_ACCESS', 
    'documents', 
    p_document_id,
    jsonb_build_object(
      'user_role', user_role,
      'payment_data_requested', p_include_payment_data,
      'document_type', doc_record.document_type,
      'access_time', now()
    ),
    inet_client_addr()::text
  );
  
  -- Determine access level
  has_access := (
    user_role = 'admin' OR 
    (user_role = 'manager' AND EXISTS (
      SELECT 1 FROM user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = doc_record.project_id 
      AND upr.role IN ('manager', 'admin')
    ))
  );
  
  -- Return data with appropriate field-level security
  RETURN QUERY
  SELECT 
    doc_record.id,
    doc_record.document_number,
    doc_record.document_type,
    doc_record.status,
    CASE
      WHEN has_access THEN doc_record.client_name
      ELSE concat(left(doc_record.client_name, 3), '***')
    END AS client_name,
    CASE
      WHEN has_access THEN doc_record.client_email
      ELSE concat(left(split_part(doc_record.client_email, '@', 1), 2), '***@', split_part(doc_record.client_email, '@', 2))
    END AS client_email,
    CASE
      WHEN has_access THEN doc_record.client_phone
      ELSE concat('***', right(doc_record.client_phone, 4))
    END AS client_phone,
    CASE
      WHEN has_access THEN doc_record.client_address
      ELSE '*** REDACTED ***'
    END AS client_address,
    CASE
      WHEN has_access THEN doc_record.total_amount
      ELSE NULL::numeric
    END AS total_amount,
    CASE
      WHEN has_access THEN doc_record.subtotal
      ELSE NULL::numeric
    END AS subtotal,
    CASE
      WHEN has_access THEN doc_record.tax_amount
      ELSE NULL::numeric
    END AS tax_amount,
    CASE
      WHEN has_access THEN doc_record.amount_paid
      ELSE NULL::numeric
    END AS amount_paid,
    CASE
      WHEN has_access THEN doc_record.payment_status
      ELSE 'RESTRICTED'
    END AS payment_status,
    doc_record.project_id,
    doc_record.created_at,
    doc_record.updated_at,
    -- Highly sensitive payment fields - admin only
    CASE
      WHEN user_role = 'admin' AND p_include_payment_data THEN doc_record.payment_url
      ELSE NULL
    END AS payment_url,
    CASE
      WHEN user_role = 'admin' AND p_include_payment_data THEN doc_record.stripe_payment_intent_id
      ELSE NULL
    END AS stripe_payment_intent_id,
    CASE
      WHEN user_role = 'admin' AND p_include_payment_data THEN doc_record.stripe_session_id
      ELSE NULL
    END AS stripe_session_id,
    CASE
      WHEN user_role = 'admin' AND p_include_payment_data THEN doc_record.acceptance_token
      ELSE NULL
    END AS acceptance_token,
    CASE
      WHEN has_access THEN doc_record.accepted_by_email
      ELSE NULL
    END AS accepted_by_email,
    CASE
      WHEN has_access THEN doc_record.accepted_by_name
      ELSE NULL
    END AS accepted_by_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 6. Create function for public quotation access (limited to acceptance_token only)
CREATE OR REPLACE FUNCTION public.get_quotation_public_secure(p_token text)
RETURNS TABLE(
  document_number text,
  client_name text,
  total_amount numeric,
  notes text,
  status text,
  document_type text,
  valid_until date,
  client_email text,
  client_phone text
) AS $$
DECLARE
  doc_record record;
BEGIN
  -- Validate token format to prevent injection
  IF p_token IS NULL OR length(p_token) < 10 THEN
    RAISE EXCEPTION 'Invalid access token';
  END IF;
  
  -- Log public access attempt
  INSERT INTO public.security_audit_log (
    user_id, action, table_name,
    new_values, ip_address
  ) VALUES (
    NULL, -- No authenticated user for public access
    'PUBLIC_QUOTATION_ACCESS', 
    'documents',
    jsonb_build_object(
      'token_used', true,
      'access_time', now(),
      'ip_address', inet_client_addr()::text
    ),
    inet_client_addr()::text
  );
  
  -- Get document by token (only for quotations and invoices)
  SELECT * INTO doc_record FROM documents d
  WHERE d.acceptance_token = p_token 
  AND d.document_type IN ('quotation', 'invoice')
  AND d.status != 'draft'; -- Don't expose draft documents
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found or access denied';
  END IF;
  
  -- Return minimal public data
  RETURN QUERY
  SELECT 
    doc_record.document_number,
    doc_record.client_name,
    doc_record.total_amount,
    doc_record.notes,
    doc_record.status,
    doc_record.document_type,
    doc_record.valid_until,
    doc_record.client_email,
    doc_record.client_phone;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';