
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

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

  console.log('RequireWorker - State:', { 
    loading, 
    hasSession: !!session, 
    hasUser: !!user, 
    userRole: user?.role,
    hasCheckedAuth 
  });

  useEffect(() => {
    if (!loading && hasCheckedAuth) {
      console.log('RequireWorker - Checking access:', { 
        hasSession: !!session, 
        userRole: user?.role 
      });

      if (!session) {
        console.log('RequireWorker - No session, redirecting to auth');
        navigate('/auth');
        return;
      }

      if (session && user && user.role === 'admin') {
        console.log('RequireWorker - Admin user, redirecting to admin dashboard');
        navigate('/admin');
        return;
      }

      if (session && user && !['worker', 'developer', 'project_manager'].includes(user.role)) {
        console.log('RequireWorker - User not a worker, redirecting to home');
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
    console.log('RequireWorker - Showing loader');
    return <Loader />;
  }

  if (!session) {
    console.log('RequireWorker - No session after loading, showing loader');
    return <Loader />;
  }

  if (!user || !['worker', 'developer', 'project_manager'].includes(user.role)) {
    console.log('RequireWorker - User not worker after loading, showing loader');
    return <Loader />;
  }

  console.log('RequireWorker - Rendering worker content');
  return <>{children}</>;
};
