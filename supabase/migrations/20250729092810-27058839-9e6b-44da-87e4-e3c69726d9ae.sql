-- Create storage bucket for expense receipts and documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Create storage policies for documents bucket
CREATE POLICY "Documents are accessible by admins and owners" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'documents' AND 
  (get_current_user_role() = 'admin' OR auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "Users can upload documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can upload any documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'documents' AND 
  get_current_user_role() = 'admin'
);

CREATE POLICY "Users can update their own documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'documents' AND 
  (get_current_user_role() = 'admin' OR auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "Admins can delete documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'documents' AND 
  get_current_user_role() = 'admin'
);