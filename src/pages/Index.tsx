import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-900">Welcome to BuildBuddy</CardTitle>
          <CardDescription className="text-lg text-gray-600">
            {user ? `Hello, ${user.email}!` : 'Please sign in to continue'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {user ? (
            <div className="space-y-4">
              <p className="text-gray-700">
                Role: <span className="font-semibold capitalize">{user.role}</span>
              </p>
              
              {user.role === 'admin' && (
                <Button 
                  className="w-full"
                  onClick={() => navigate('/admin')}
                >
                  Access Admin Dashboard
                </Button>
              )}
              
              <Button 
                variant="outline" 
                onClick={signOut}
                className="w-full"
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <Link to="/auth">
              <Button className="w-full">
                Sign In / Sign Up
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;