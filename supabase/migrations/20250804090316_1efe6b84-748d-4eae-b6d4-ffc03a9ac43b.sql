-- Add conversion tracking fields to documents table
ALTER TABLE public.documents 
ADD COLUMN source_document_id UUID REFERENCES public.documents(id),
ADD COLUMN converted_to_invoice_id UUID REFERENCES public.documents(id);

-- Add index for better performance on conversion lookups
CREATE INDEX idx_documents_source_document_id ON public.documents(source_document_id);
CREATE INDEX idx_documents_converted_to_invoice_id ON public.documents(converted_to_invoice_id);