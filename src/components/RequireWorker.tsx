
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';

interface RequireWorkerProps {
  children: React.ReactNode;
}

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
  </div>
);

export const RequireWorker = ({ children }: RequireWorkerProps) => {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  logger.debug('RequireWorker - State', { 
    loading, 
    hasSession: !!session, 
    hasUser: !!user, 
    userRole: user?.role,
    hasCheckedAuth 
  });

  useEffect(() => {
    if (!loading && hasCheckedAuth) {
      logger.debug('RequireWorker - Checking access', { 
        hasSession: !!session, 
        userRole: user?.role 
      });

      if (!session) {
        logger.debug('RequireWorker - No session, redirecting to auth');
        navigate('/auth');
        return;
      }

      if (session && user && user.role === 'admin') {
        logger.debug('RequireWorker - Admin user, redirecting to admin dashboard');
        navigate('/admin');
        return;
      }

      if (session && user && !['worker', 'developer', 'project_manager'].includes(user.role)) {
        logger.debug('RequireWorker - User not a worker, redirecting to home');
        navigate('/');
        return;
      }
    }
  }, [loading, session, user?.role, navigate, hasCheckedAuth]);

  useEffect(() => {
    if (!loading) {
      setHasCheckedAuth(true);
    }
  }, [loading]);

  if (loading || !hasCheckedAuth) {
    return <Loader />;
  }

  if (!session) {
    return <Loader />;
  }

  if (!user || !['worker', 'developer', 'project_manager'].includes(user.role)) {
    return <Loader />;
  }
  return <>{children}</>;
};
