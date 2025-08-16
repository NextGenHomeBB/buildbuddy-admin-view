import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface SensitiveOperationLog {
  id: string;
  user_id: string;
  operation_type: string;
  table_name: string;
  record_id?: string;
  operation_data: any;
  ip_address?: string;
  user_agent?: string;
  risk_score: number;
  timestamp: string;
}

interface DataIntegrityCheck {
  check_name: string;
  status: 'PASS' | 'FAIL';
  issue_count: number;
  details: any;
}

export const useSensitiveOperationAudit = () => {
  const queryClient = useQueryClient();

  // Fetch sensitive operation logs (admin only)
  const {
    data: auditLogs,
    isLoading: isLoadingLogs,
    error: logsError
  } = useQuery({
    queryKey: ['sensitive-operation-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sensitive_operation_audit')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        logger.error('Failed to fetch audit logs', error);
        throw error;
      }

      return data as SensitiveOperationLog[];
    },
    enabled: true, // RLS will handle permission check
  });

  // Log sensitive operation
  const logSensitiveOperation = useMutation({
    mutationFn: async ({
      operationType,
      tableName,
      recordId,
      operationData = {},
      riskScore = 0
    }: {
      operationType: string;
      tableName: string;
      recordId?: string;
      operationData?: any;
      riskScore?: number;
    }) => {
      const { error } = await supabase.rpc('log_sensitive_operation', {
        p_operation_type: operationType,
        p_table_name: tableName,
        p_record_id: recordId,
        p_operation_data: operationData,
        p_risk_score: riskScore
      });

      if (error) {
        logger.error('Failed to log sensitive operation', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sensitive-operation-audit'] });
    },
    onError: (error) => {
      logger.error('Sensitive operation logging failed', error);
      toast({
        title: "Security Logging Error",
        description: "Failed to log security event. Please try again.",
        variant: "destructive",
      });
    }
  });

  return {
    auditLogs,
    isLoadingLogs,
    logsError,
    logSensitiveOperation: logSensitiveOperation.mutate
  };
};

export const useDataIntegrityCheck = () => {
  // Run data integrity checks
  const {
    data: integrityResults,
    isLoading: isCheckingIntegrity,
    error: integrityError,
    refetch: runIntegrityCheck
  } = useQuery({
    queryKey: ['data-integrity-check'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('verify_data_integrity');

      if (error) {
        logger.error('Data integrity check failed', error);
        throw error;
      }

      return data as DataIntegrityCheck[];
    },
    enabled: false, // Run manually
  });

  const integrityIssues = integrityResults?.filter(result => result.status === 'FAIL') || [];
  const hasIntegrityIssues = integrityIssues.length > 0;

  return {
    integrityResults,
    integrityIssues,
    hasIntegrityIssues,
    isCheckingIntegrity,
    integrityError,
    runIntegrityCheck
  };
};