import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Document {
  id: string;
  document_type: string;
  document_number: string;
  project_id?: string;
  created_by: string;
  client_name: string;
  client_email?: string;
  client_address?: string;
  client_phone?: string;
  valid_until?: string;
  notes?: string;
  terms_conditions?: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  pdf_url?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentLine {
  id: string;
  document_id: string;
  material_sku?: string;
  material_name: string;
  material_description?: string;
  material_unit: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
  created_at: string;
}

export interface Material {
  sku: string;
  name: string;
  description: string;
  unit: string;
  price: number;
  supplier: string;
  availability: boolean;
}

export const useDocuments = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchDocuments = async (projectId?: string) => {
    setLoading(true);
    try {
      let query = supabase.from('documents').select('*');
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createDocument = async (documentData: any) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .insert(documentData)
        .select()
        .single();
      
      if (error) throw error;
      
      setDocuments(prev => [data as Document, ...prev]);
      toast({
        title: "Success",
        description: "Document created successfully",
      });
      
      return data as Document;
    } catch (error) {
      console.error('Error creating document:', error);
      toast({
        title: "Error",
        description: "Failed to create document",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateDocument = async (id: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      setDocuments(prev => prev.map(doc => doc.id === id ? data as Document : doc));
      toast({
        title: "Success", 
        description: "Document updated successfully",
      });
      
      return data as Document;
    } catch (error) {
      console.error('Error updating document:', error);
      toast({
        title: "Error",
        description: "Failed to update document",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setDocuments(prev => prev.filter(doc => doc.id !== id));
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error", 
        description: "Failed to delete document",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    documents,
    loading,
    fetchDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
  };
};

export const useDocumentLines = (documentId: string) => {
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchLines = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_lines')
        .select('*')
        .eq('document_id', documentId)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      
      setLines(data || []);
    } catch (error) {
      console.error('Error fetching document lines:', error);
      toast({
        title: "Error",
        description: "Failed to fetch document lines",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addLine = async (lineData: Omit<DocumentLine, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('document_lines')
        .insert([lineData])
        .select()
        .single();
      
      if (error) throw error;
      
      setLines(prev => [...prev, data]);
      return data;
    } catch (error) {
      console.error('Error adding document line:', error);
      toast({
        title: "Error",
        description: "Failed to add line item",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateLine = async (id: string, updates: Partial<DocumentLine>) => {
    try {
      const { data, error } = await supabase
        .from('document_lines')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      setLines(prev => prev.map(line => line.id === id ? data : line));
      return data;
    } catch (error) {
      console.error('Error updating document line:', error);
      toast({
        title: "Error",
        description: "Failed to update line item",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteLine = async (id: string) => {
    try {
      const { error } = await supabase
        .from('document_lines')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setLines(prev => prev.filter(line => line.id !== id));
    } catch (error) {
      console.error('Error deleting document line:', error);
      toast({
        title: "Error",
        description: "Failed to delete line item",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    if (documentId) {
      fetchLines();
    }
  }, [documentId]);

  return {
    lines,
    loading,
    fetchLines,
    addLine,
    updateLine,
    deleteLine,
  };
};

export const useMaterialLookup = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const searchMaterials = async (query: string): Promise<Material[]> => {
    if (query.length < 2) return [];
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('material-lookup', {
        body: { query, limit: 10 }
      });
      
      if (error) throw error;
      
      return data.materials || [];
    } catch (error) {
      console.error('Error searching materials:', error);
      toast({
        title: "Error",
        description: "Failed to search materials",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    searchMaterials,
    loading,
  };
};