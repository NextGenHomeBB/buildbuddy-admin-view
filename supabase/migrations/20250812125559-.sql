-- Add manual payments and quotation acceptance (no Stripe)

-- 1) Extend documents with acceptance and payment summary fields
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS accepted_by_name text,
  ADD COLUMN IF NOT EXISTS accepted_by_email text,
  ADD COLUMN IF NOT EXISTS acceptance_note text,
  ADD COLUMN IF NOT EXISTS acceptance_ip text,
  ADD COLUMN IF NOT EXISTS acceptance_token text NOT NULL DEFAULT (gen_random_uuid())::text;

-- Ensure uniqueness on acceptance_token
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'idx_documents_acceptance_token_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_documents_acceptance_token_unique ON public.documents(acceptance_token);
  END IF;
END $$;

-- 2) Create document_payments table for partial/manual payments
CREATE TABLE IF NOT EXISTS public.document_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  method text,
  reference text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

ALTER TABLE public.document_payments ENABLE ROW LEVEL SECURITY;

-- 2a) RLS policies for document_payments
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'document_payments' AND policyname = 'Admins can manage all document payments'
  ) THEN
    CREATE POLICY "Admins can manage all document payments"
    ON public.document_payments
    FOR ALL
    USING (get_current_user_role() = 'admin')
    WITH CHECK (get_current_user_role() = 'admin');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'document_payments' AND policyname = 'Managers can manage payments for their projects'
  ) THEN
    CREATE POLICY "Managers can manage payments for their projects"
    ON public.document_payments
    FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.user_project_role upr ON upr.project_id = d.project_id
      WHERE d.id = document_payments.document_id
        AND upr.user_id = auth.uid()
        AND upr.role IN ('manager','admin')
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.user_project_role upr ON upr.project_id = d.project_id
      WHERE d.id = document_payments.document_id
        AND upr.user_id = auth.uid()
        AND upr.role IN ('manager','admin')
    ));
  END IF;
END $$;

-- 2b) Trigger to set created_by and updated_at
CREATE OR REPLACE FUNCTION public.set_document_payments_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN
      NEW.created_by := auth.uid();
    END IF;
    NEW.created_at := now();
    NEW.updated_at := now();
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_document_payments_defaults'
  ) THEN
    CREATE TRIGGER trg_document_payments_defaults
    BEFORE INSERT OR UPDATE ON public.document_payments
    FOR EACH ROW EXECUTE FUNCTION public.set_document_payments_defaults();
  END IF;
END $$;

-- 3) Payment aggregation trigger to sync documents.amount_paid and payment_status
CREATE OR REPLACE FUNCTION public.refresh_document_payment_status(p_document_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_paid numeric := 0;
  v_total numeric := 0;
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO v_paid
  FROM public.document_payments
  WHERE document_id = p_document_id;

  SELECT total_amount INTO v_total FROM public.documents WHERE id = p_document_id;

  UPDATE public.documents
  SET amount_paid = v_paid,
      payment_status = CASE 
        WHEN v_paid >= v_total AND v_total > 0 THEN 'paid'
        WHEN v_paid > 0 THEN 'partial'
        ELSE 'pending'
      END,
      paid_at = CASE WHEN v_paid >= v_total AND v_total > 0 THEN now() ELSE paid_at END,
      updated_at = now()
  WHERE id = p_document_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.document_payments_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM public.refresh_document_payment_status(COALESCE(NEW.document_id, OLD.document_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_document_payments_changed') THEN
    CREATE TRIGGER trg_document_payments_changed
    AFTER INSERT OR UPDATE OR DELETE ON public.document_payments
    FOR EACH ROW EXECUTE FUNCTION public.document_payments_changed();
  END IF;
END $$;

-- Also refresh status if a document total changes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_documents_total_changed_payments_refresh') THEN
    CREATE TRIGGER trg_documents_total_changed_payments_refresh
    AFTER UPDATE OF total_amount ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.document_payments_changed();
  END IF;
END $$;

-- 4) RPC to accept a quotation by token (publicly callable)
CREATE OR REPLACE FUNCTION public.accept_quotation_by_token(p_token text, p_name text, p_email text, p_note text, p_ip text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- 5) RPC to get limited public document info by token
CREATE OR REPLACE FUNCTION public.get_document_public(p_token text)
RETURNS TABLE(document_number text, client_name text, total_amount numeric, notes text, status text, document_type text, valid_until date)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT document_number, client_name, total_amount, notes, status, document_type, valid_until
  FROM public.documents
  WHERE acceptance_token = p_token;
$$;