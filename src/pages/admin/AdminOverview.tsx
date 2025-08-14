
import { useState, useEffect } from 'react';
import { FolderKanban, Users, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDeviceType } from '@/hooks/useDeviceType';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';
import { OverviewModal } from '@/components/admin/OverviewModal';
import EnhancedSecurityMonitor from '@/components/admin/EnhancedSecurityMonitor';

interface Stats {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  total_users: number;
  active_users: number;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  progress: number;
}

export function AdminOverview() {
  const { user, session, loading: authLoading, isAdmin } = useAuth();
  const deviceType = useDeviceType();
  const [stats, setStats] = useState<Stats>({
    total_projects: 0,
    active_projects: 0,
    completed_projects: 0,
    total_users: 0,
    active_users: 0
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add extensive debug logging
  console.log('AdminOverview render:', { 
    authLoading, 
    hasSession: !!session, 
    hasUser: !!user, 
    isAdmin,
    userRole: user?.role,
    userId: user?.id,
    loading
  });

  useEffect(() => {
    const fetchData = async () => {
      console.log('AdminOverview fetchData called:', { authLoading, session: !!session, user: !!user, isAdmin });
      
      // Only fetch if we have a valid authenticated admin user
      if (authLoading) {
        console.log('Still loading auth, skipping data fetch');
        return;
      }
      
      if (!session || !user) {
        console.log('No session or user, skipping data fetch');
        return;
      }
      
      if (!isAdmin) {
        console.log('User is not admin, skipping data fetch');
        return;
      }

      console.log('Starting data fetch for admin user:', user.id);
      setLoading(true);
      setError(null);

      try {
        // Fetch basic project stats first
        console.log('Fetching projects...');
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('id, status')
          .limit(10);
        
        console.log('Projects result:', { projects, projectsError });

        if (projectsError) {
          throw new Error(`Projects error: ${projectsError.message}`);
        }

        // Fetch basic user count
        console.log('Fetching profiles...');
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('id')
          .limit(10);

        console.log('Users result:', { users, usersError });

        if (usersError) {
          throw new Error(`Users error: ${usersError.message}`);
        }

        // Fetch recent projects
        console.log('Fetching recent projects...');
        const { data: recent, error: recentError } = await supabase
          .from('projects')
          .select('id, name, description, status, progress')
          .order('created_at', { ascending: false })
          .limit(3);

        console.log('Recent projects result:', { recent, recentError });

        if (recentError) {
          throw new Error(`Recent projects error: ${recentError.message}`);
        }

        // Calculate stats safely
        const projectStats = projects || [];
        const userStats = users || [];
        
        const newStats = {
          total_projects: projectStats.length,
          active_projects: projectStats.filter(p => p.status === 'active').length,
          completed_projects: projectStats.filter(p => p.status === 'completed').length,
          total_users: userStats.length,
          active_users: userStats.length
        };

        console.log('Setting stats:', newStats);
        setStats(newStats);
        setRecentProjects(recent || []);
        console.log('Data fetch completed successfully');

      } catch (error) {
        console.error('Error fetching overview data:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
      } finally {
        console.log('Setting loading to false');
        setLoading(false);
      }
    };

    fetchData();
  }, [authLoading, session, user, isAdmin]);

  // Always render something - never return empty
  console.log('About to render, final checks:', { authLoading, session: !!session, user: !!user, isAdmin, loading, error });

  // Show loading while auth is loading
  if (authLoading) {
    console.log('Rendering auth loading state');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Show error if not admin or no session
  if (!session || !user || !isAdmin) {
    console.log('Rendering access denied state');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-destructive text-lg">Access denied</p>
          <p className="text-sm text-muted-foreground">Admin access required</p>
          <p className="text-xs text-muted-foreground">
            Debug: session={session ? 'yes' : 'no'}, user={user ? 'yes' : 'no'}, isAdmin={isAdmin ? 'yes' : 'no'}
          </p>
        </div>
      </div>
    );
  }

  // Show loading while fetching data
  if (loading) {
    console.log('Rendering data loading state');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error if data fetch failed
  if (error) {
    console.log('Rendering error state');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-destructive text-lg">Error loading dashboard</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  console.log('Rendering main dashboard content');


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Here's what's happening with your projects.
          </p>
        </div>
        <OverviewModal stats={stats} />
      </div>

      {/* Recent Projects */}
      <div className={cn(
        "grid gap-6",
        deviceType === 'tablet' && "tablet-grid-2",
        deviceType === 'desktop' && "lg:grid-cols-2"
      )}>
        <Card className={cn(
          "admin-card",
          deviceType === 'desktop' && "desktop-hover-effects"
        )}>
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Recent Projects</CardTitle>
            <CardDescription>Latest project updates and progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentProjects.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No projects found</p>
            ) : (
              recentProjects.map((project) => (
                <div key={project.id} className="space-y-3 border-b border-border last:border-0 pb-4 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-foreground">{project.name}</h4>
                      <p className="text-sm text-muted-foreground">{project.description || 'No description'}</p>
                    </div>
                    <Badge 
                      variant={
                        project.status === 'active' ? 'default' :
                        project.status === 'completed' ? 'secondary' :
                        project.status === 'on_hold' ? 'destructive' : 'outline'
                      }
                      className="capitalize"
                    >
                      {project.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{Math.round(project.progress)}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <button className="w-full p-4 text-left rounded-lg border border-border hover:bg-accent transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg admin-gradient flex items-center justify-center">
                  <FolderKanban className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Create New Project</h4>
                  <p className="text-sm text-muted-foreground">Start a new project with templates</p>
                </div>
              </div>
            </button>
            
            <button className="w-full p-4 text-left rounded-lg border border-border hover:bg-accent transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success flex items-center justify-center">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Invite Team Member</h4>
                  <p className="text-sm text-muted-foreground">Add new users to your workspace</p>
                </div>
              </div>
            </button>
            
            <button className="w-full p-4 text-left rounded-lg border border-border hover:bg-accent transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">View Reports</h4>
                  <p className="text-sm text-muted-foreground">Analytics and project insights</p>
                </div>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Security Monitoring Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Security Status</h2>
          <Badge variant="secondary">Enhanced Protection</Badge>
        </div>
        <EnhancedSecurityMonitor />
      </div>
    </div>
  );
}
