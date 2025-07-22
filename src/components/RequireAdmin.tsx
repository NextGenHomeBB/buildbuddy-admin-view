
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
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  console.log('RequireAdmin - State:', { 
    loading, 
    hasSession: !!session, 
    hasUser: !!user, 
    userRole: user?.role,
    hasCheckedAuth 
  });

  useEffect(() => {
    // Only check auth after loading is complete and we have session data
    if (!loading && hasCheckedAuth) {
      console.log('RequireAdmin - Checking access:', { 
        hasSession: !!session, 
        userRole: user?.role 
      });

      // If no session, redirect to auth
      if (!session) {
        console.log('RequireAdmin - No session, redirecting to auth');
        navigate('/auth');
        return;
      }

      // If we have a session but user is not admin, redirect to home
      if (session && user && user.role !== 'admin') {
        console.log('RequireAdmin - User is not admin, redirecting to home');
        navigate('/');
        return;
      }
    }
  }, [loading, session, user?.role, navigate, hasCheckedAuth]);

  useEffect(() => {
    // Mark that we've finished the initial auth check
    if (!loading) {
      setHasCheckedAuth(true);
    }
  }, [loading]);

  // Show loader while still loading or while we haven't checked auth yet
  if (loading || !hasCheckedAuth) {
    console.log('RequireAdmin - Showing loader');
    return <Loader />;
  }

  // If no session after loading, show loader (will redirect via useEffect)
  if (!session) {
    console.log('RequireAdmin - No session after loading, showing loader');
    return <Loader />;
  }

  // If user is not admin after loading, show loader (will redirect via useEffect)
  if (!user || user.role !== 'admin') {
    console.log('RequireAdmin - User not admin after loading, showing loader');
    return <Loader />;
  }

  console.log('RequireAdmin - Rendering admin content');
  return <>{children}</>;
};
