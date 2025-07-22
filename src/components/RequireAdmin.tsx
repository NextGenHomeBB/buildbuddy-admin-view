import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface RequireAdminProps {
  children: React.ReactNode;
}

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
  </div>
);

export const RequireAdmin = ({ children }: RequireAdminProps) => {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session && user?.role !== 'admin') {
      navigate('/');
    }
  }, [loading, session, user?.role, navigate]);

  if (loading || session === null) {
    return <Loader />;
  }

  if (user?.role !== 'admin') {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
};