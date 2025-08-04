-- Create document sequences table for auto-incrementing numbers
CREATE TABLE public.document_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL UNIQUE,
  current_number INTEGER NOT NULL DEFAULT 0,
  prefix TEXT NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert initial sequences for different document types
INSERT INTO public.document_sequences (document_type, current_number, prefix, year) VALUES
('quotation', 0, 'Q', EXTRACT(YEAR FROM CURRENT_DATE)),
('invoice', 0, 'I', EXTRACT(YEAR FROM CURRENT_DATE)),
('estimate', 0, 'E', EXTRACT(YEAR FROM CURRENT_DATE));

-- Create function to get next document number
CREATE OR REPLACE FUNCTION public.next_document_number(doc_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_year INTEGER;
  next_num INTEGER;
  prefix TEXT;
  result TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Check if we need to reset for new year
  UPDATE public.document_sequences 
  SET current_number = 0, year = current_year, updated_at = now()
  WHERE document_type = doc_type AND year < current_year;
  
  -- Get and increment the next number atomically
  UPDATE public.document_sequences 
  SET current_number = current_number + 1, updated_at = now()
  WHERE document_type = doc_type AND year = current_year
  RETURNING current_number, prefix INTO next_num, prefix;
  
  -- Format: PREFIX-YEAR-NUMBER (e.g., Q-2024-001)
  result := prefix || '-' || current_year || '-' || LPAD(next_num::TEXT, 3, '0');
  
  RETURN result;
END;
$$;

-- Add Stripe payment fields to documents table
ALTER TABLE public.documents ADD COLUMN stripe_session_id TEXT;
ALTER TABLE public.documents ADD COLUMN stripe_payment_intent_id TEXT;
ALTER TABLE public.documents ADD COLUMN payment_status TEXT DEFAULT 'pending';
ALTER TABLE public.documents ADD COLUMN payment_url TEXT;
ALTER TABLE public.documents ADD COLUMN paid_at TIMESTAMPTZ;

-- Create trigger to auto-assign document numbers
CREATE OR REPLACE FUNCTION public.assign_document_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only assign number if not already set
  IF NEW.document_number IS NULL OR NEW.document_number = '' THEN
    NEW.document_number := public.next_document_number(NEW.document_type);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER assign_document_number_trigger
  BEFORE INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_document_number();

-- Enable RLS on document_sequences
ALTER TABLE public.document_sequences ENABLE ROW LEVEL SECURITY;

-- Create policy for document_sequences
CREATE POLICY "Admins can manage document sequences" 
ON public.document_sequences 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Create policy for managers to view sequences
CREATE POLICY "Managers can view document sequences" 
ON public.document_sequences 
FOR SELECT 
USING (get_current_user_role() = ANY(ARRAY['admin', 'manager']));

-- Add indexes for performance
CREATE INDEX idx_documents_stripe_session ON public.documents(stripe_session_id);
CREATE INDEX idx_documents_payment_status ON public.documents(payment_status);
CREATE INDEX idx_document_sequences_type_year ON public.document_sequences(document_type, year);