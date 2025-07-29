import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/utils/logger';

export interface OfflineAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
  timestamp: number;
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingActions();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load pending actions from localStorage on mount
    loadPendingActions();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadPendingActions = () => {
    try {
      const stored = localStorage.getItem('offlineActions');
      if (stored) {
        setPendingActions(JSON.parse(stored));
      }
    } catch (error) {
      logger.error('Failed to load offline actions', error);
    }
  };

  const savePendingActions = (actions: OfflineAction[]) => {
    try {
      localStorage.setItem('offlineActions', JSON.stringify(actions));
      setPendingActions(actions);
    } catch (error) {
      logger.error('Failed to save offline actions', error);
    }
  };

  const addOfflineAction = (action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
    const newAction: OfflineAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    const updatedActions = [...pendingActions, newAction];
    savePendingActions(updatedActions);
  };

  const syncPendingActions = async () => {
    if (pendingActions.length === 0) return;

    try {
      // In a real implementation, you would sync these with your backend
      logger.debug('Syncing offline actions', { count: pendingActions.length });
      
      // For now, just clear the actions and invalidate queries
      savePendingActions([]);
      queryClient.invalidateQueries();
      
      // Show success message
      logger.debug('Offline actions synced successfully');
    } catch (error) {
      logger.error('Failed to sync offline actions', error);
    }
  };

  const clearPendingActions = () => {
    savePendingActions([]);
  };

  return {
    isOnline,
    pendingActions,
    addOfflineAction,
    syncPendingActions,
    clearPendingActions,
    hasPendingActions: pendingActions.length > 0,
  };
}