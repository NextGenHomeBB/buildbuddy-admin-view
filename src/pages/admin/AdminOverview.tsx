import { useState, useEffect } from 'react';
import { BarChart3, FolderKanban, Users, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

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
  const [stats, setStats] = useState<Stats>({
    total_projects: 0,
    active_projects: 0,
    completed_projects: 0,
    total_users: 0,
    active_users: 0
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching overview data...');
        
        // Fetch projects stats
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('status');
        
        // Fetch users stats  
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('id, role');

        // Fetch recent projects
        const { data: recent, error: recentError } = await supabase
          .from('projects')
          .select('id, name, description, status, progress')
          .order('created_at', { ascending: false })
          .limit(3);

        console.log('Overview data:', { projects, users, recent });

        if (projectsError) console.error('Projects error:', projectsError);
        if (usersError) console.error('Users error:', usersError);
        if (recentError) console.error('Recent projects error:', recentError);

        // Calculate stats
        const projectStats = projects || [];
        const userStats = users || [];
        
        setStats({
          total_projects: projectStats.length,
          active_projects: projectStats.filter(p => p.status === 'active').length,
          completed_projects: projectStats.filter(p => p.status === 'completed').length,
          total_users: userStats.length,
          active_users: userStats.filter(u => u.role !== 'client').length
        });

        setRecentProjects(recent || []);
      } catch (error) {
        console.error('Error fetching overview data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statCards = [
    {
      title: 'Total Projects',
      value: stats.total_projects,
      description: '+2 from last month',
      icon: FolderKanban,
      trend: 'up'
    },
    {
      title: 'Active Projects',
      value: stats.active_projects,
      description: 'Currently in progress',
      icon: Clock,
      trend: 'neutral'
    },
    {
      title: 'Completed Projects',
      value: stats.completed_projects,
      description: 'This quarter',
      icon: CheckCircle,
      trend: 'up'
    },
    {
      title: 'Team Members',
      value: stats.active_users,
      description: `${stats.total_users} total users`,
      icon: Users,
      trend: 'up'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here's what's happening with your projects.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="admin-card hover:admin-shadow transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {stat.trend === 'up' && (
                  <TrendingUp className="h-3 w-3 text-success" />
                )}
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Projects */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Recent Projects</CardTitle>
            <CardDescription>Latest project updates and progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentProjects.map((project) => (
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
            ))}
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