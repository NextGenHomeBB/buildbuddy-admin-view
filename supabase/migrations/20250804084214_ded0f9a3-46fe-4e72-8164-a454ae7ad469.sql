-- Create documents table for quotations and invoices
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type TEXT NOT NULL CHECK (document_type IN ('quotation', 'invoice', 'estimate')),
  document_number TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id),
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  
  -- Client information
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_address TEXT,
  client_phone TEXT,
  
  -- Document details
  valid_until DATE,
  notes TEXT,
  terms_conditions TEXT,
  
  -- Financial
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Status and storage
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  pdf_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create document_lines table for line items
CREATE TABLE public.document_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  
  -- Material information
  material_sku TEXT,
  material_name TEXT NOT NULL,
  material_description TEXT,
  material_unit TEXT DEFAULT 'pcs',
  
  -- Pricing
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Display order
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Enable RLS on documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create policies for documents
CREATE POLICY "Admins can manage all documents" 
ON public.documents 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Managers can manage documents for their projects" 
ON public.documents 
FOR ALL 
USING (
  get_current_user_role() IN ('admin', 'manager') OR
  EXISTS (
    SELECT 1 FROM public.user_project_role upr 
    WHERE upr.user_id = auth.uid() 
    AND upr.project_id = documents.project_id 
    AND upr.role IN ('manager', 'admin')
  )
);

-- Enable RLS on document_lines table
ALTER TABLE public.document_lines ENABLE ROW LEVEL SECURITY;

-- Create policies for document_lines
CREATE POLICY "Users can manage lines for accessible documents" 
ON public.document_lines 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.documents d 
    WHERE d.id = document_lines.document_id 
    AND (
      get_current_user_role() = 'admin' OR
      EXISTS (
        SELECT 1 FROM public.user_project_role upr 
        WHERE upr.user_id = auth.uid() 
        AND upr.project_id = d.project_id 
        AND upr.role IN ('manager', 'admin')
      )
    )
  )
);

-- Create storage policies for documents bucket
CREATE POLICY "Authenticated users can view documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can upload documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'documents' AND 
  auth.uid() IS NOT NULL AND
  (get_current_user_role() IN ('admin', 'manager'))
);

-- Create triggers for updated_at
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update document totals when lines change
CREATE OR REPLACE FUNCTION public.update_document_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.documents 
  SET 
    subtotal = (
      SELECT COALESCE(SUM(line_total), 0) 
      FROM public.document_lines 
      WHERE document_id = COALESCE(NEW.document_id, OLD.document_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.document_id, OLD.document_id);
  
  -- Update total_amount (subtotal + tax)
  UPDATE public.documents 
  SET 
    tax_amount = subtotal * (tax_rate / 100),
    total_amount = subtotal + (subtotal * (tax_rate / 100))
  WHERE id = COALESCE(NEW.document_id, OLD.document_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for document totals
CREATE TRIGGER update_document_totals_on_line_change
  AFTER INSERT OR UPDATE OR DELETE ON public.document_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_document_totals();