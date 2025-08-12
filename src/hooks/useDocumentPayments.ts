import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DocumentPayment {
  id: string;
  document_id: string;
  amount: number;
  payment_date: string;
  method?: string;
  reference?: string;
  notes?: string;
  created_at: string;
  created_by: string;
}

export interface NewPaymentData {
  document_id: string;
  amount: number;
  payment_date: string;
  method?: string;
  reference?: string;
  notes?: string;
}

export const useDocumentPayments = (documentId?: string) => {
  const [payments, setPayments] = useState<DocumentPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchPayments = async (docId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_payments')
        .select('*')
        .eq('document_id', docId)
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addPayment = async (paymentData: NewPaymentData) => {
    try {
      const { data, error } = await supabase
        .from('document_payments')
        .insert({ ...paymentData, created_by: "" }) // trigger will overwrite
        .select()
        .single();
      
      if (error) throw error;
      
      setPayments(prev => [data, ...prev]);
      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });
      
      return data;
    } catch (error) {
      console.error('Error adding payment:', error);
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deletePayment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('document_payments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setPayments(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Success",
        description: "Payment deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast({
        title: "Error",
        description: "Failed to delete payment",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    if (documentId) {
      fetchPayments(documentId);
    }
  }, [documentId]);

  return {
    payments,
    loading,
    fetchPayments,
    addPayment,
    deletePayment,
  };
};