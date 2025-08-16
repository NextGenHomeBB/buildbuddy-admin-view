// Auth state cleanup utility to prevent authentication limbo states
export const cleanupAuthState = () => {
  // Remove standard auth tokens
  localStorage.removeItem('supabase.auth.token');
  
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  // Remove from sessionStorage if in use
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

// Clear any cached user/session state that might cause inconsistencies
export const clearCachedUserState = () => {
  // Clear any React Query cache related to auth
  const queryClient = (window as any).__REACT_QUERY_CLIENT__;
  if (queryClient) {
    queryClient.invalidateQueries(['auth']);
    queryClient.invalidateQueries(['user']);
    queryClient.clear();
  }
};