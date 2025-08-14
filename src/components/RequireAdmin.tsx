
import { useEffect, useState } from 'react';
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
    // Only redirect after loading is complete
    if (!loading) {
      if (!session) {
        console.log('No session, redirecting to auth');
        navigate('/auth');
        return;
      }

      if (!user || user.role !== 'admin') {
        console.log('User is not admin, redirecting to home', { user: user?.role });
        navigate('/');
        return;
      }
    }
  }, [loading, session, user, navigate]);

  // Show loader while loading
  if (loading) {
    return <Loader />;
  }

  // If no session after loading, show loader (will redirect)
  if (!session) {
    return <Loader />;
  }

  // If user is not admin after loading, show loader (will redirect)
  if (!user || user.role !== 'admin') {
    return <Loader />;
  }
  
  return <>{children}</>;
};
