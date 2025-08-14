
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Don't fetch data until auth is ready and user is confirmed admin
      if (authLoading || !session || !user || !isAdmin) {
        logger.debug('AdminOverview: Waiting for auth...', { 
          authLoading, 
          hasSession: !!session, 
          hasUser: !!user, 
          isAdmin,
          userRole: user?.role,
          userId: user?.id 
        });
        return;
      }

      // Prevent duplicate fetches
      if (hasInitialized) {
        logger.debug('AdminOverview: Data already initialized, skipping fetch');
        return;
      }

      logger.debug('AdminOverview: Starting data fetch for admin user:', user.id);
      setLoading(true);
      setError(null);
      setHasInitialized(true);

      try {
        // Test the current user role function first
        const { data: roleTest, error: roleError } = await supabase.rpc('get_current_user_role');
        logger.debug('Role test result:', { roleTest, roleError });

        // Fetch projects stats
        logger.debug('Fetching projects...');
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('status');
        
        logger.debug('Projects query result:', { projects, projectsError });

        // Fetch users stats  
        logger.debug('Fetching profiles...');
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('id');

        // Just get basic user count for now
        const { data: userCount, error: rolesError } = await supabase
          .rpc('get_current_user_role'); // This will validate our connection

        logger.debug('Role test result:', { userCount, rolesError });

        // Fetch recent projects
        logger.debug('Fetching recent projects...');
        const { data: recent, error: recentError } = await supabase
          .from('projects')
          .select('id, name, description, status, progress')
          .order('created_at', { ascending: false })
          .limit(3);

        logger.debug('Recent projects result:', { recent, recentError });

        // Check for any errors
        if (projectsError || usersError || rolesError || recentError) {
          const errorMsg = `Data fetch errors: ${[projectsError?.message, usersError?.message, rolesError?.message, recentError?.message].filter(Boolean).join(', ')}`;
          logger.error(errorMsg);
          setError(errorMsg);
          return;
        }

        // Calculate stats
        const projectStats = projects || [];
        const userStats = users || [];
        
        const newStats = {
          total_projects: projectStats.length,
          active_projects: projectStats.filter(p => p.status === 'active').length,
          completed_projects: projectStats.filter(p => p.status === 'completed').length,
          total_users: userStats.length,
          active_users: userStats.length // Simplified for now
        };

        logger.debug('Calculated stats:', newStats);
        setStats(newStats);
        setRecentProjects(recent || []);
        logger.debug('AdminOverview: Data fetch completed successfully');

      } catch (error) {
        logger.error('Error fetching overview data:', error);
        setError(`Failed to load dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        logger.debug('AdminOverview: Setting loading to false');
        setLoading(false);
      }
    };

    fetchData();
  }, [authLoading, session, user, isAdmin]); // Depend on auth state

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">Authenticating...</span>
      </div>
    );
  }

  // Show error if not admin or no session
  if (!session || !user || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <p className="text-destructive">Access denied</p>
          <p className="text-sm text-muted-foreground">Admin access required</p>
        </div>
      </div>
    );
  }

  // Show loading while fetching data
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">Loading dashboard...</span>
      </div>
    );
  }

  // Show error if data fetch failed
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <p className="text-destructive">Error loading dashboard</p>
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
    </div>
  );
}
