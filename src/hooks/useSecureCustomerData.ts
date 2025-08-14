import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SecureCustomerData {
  id: string;
  document_number: string;
  document_type: string;
  status: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  total_amount: number | null;
  subtotal: number | null;
  tax_amount: number | null;
  amount_paid: number | null;
  payment_status: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

export const useSecureCustomerData = (
  projectId?: string,
  documentType?: string,
  includePaymentData: boolean = false
) => {
  return useQuery({
    queryKey: ['secure-customer-data', projectId, documentType, includePaymentData],
    queryFn: async (): Promise<SecureCustomerData[]> => {
      // Enhanced audit logging for customer data access
      await supabase.rpc('audit_sensitive_operation', {
        operation_type: 'customer_data_access',
        table_name: 'documents',
        record_id: null,
        sensitive_data_accessed: ['client_name', 'client_email', 'client_phone', 'financial_data']
      });

      const { data, error } = await supabase.rpc('get_customer_data_secure', {
        p_project_id: projectId || null,
        p_document_type: documentType || null,
        p_include_payment_data: includePaymentData
      });

      if (error) {
        console.error('Error fetching secure customer data:', error);
        // Log security failure
        await supabase.rpc('log_critical_security_event', {
          event_type: 'CUSTOMER_DATA_ACCESS_FAILED',
          threat_level: 'critical',
          details: { error: error.message, projectId, documentType }
        });
        throw error;
      }

      return data || [];
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
};