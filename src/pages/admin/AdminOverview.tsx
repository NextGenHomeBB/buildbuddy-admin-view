import { BarChart3, FolderKanban, Users, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { mockStats, mockProjects } from '@/lib/mockData';

const statCards = [
  {
    title: 'Total Projects',
    value: mockStats.total_projects,
    description: '+2 from last month',
    icon: FolderKanban,
    trend: 'up'
  },
  {
    title: 'Active Projects',
    value: mockStats.active_projects,
    description: 'Currently in progress',
    icon: Clock,
    trend: 'neutral'
  },
  {
    title: 'Completed Projects',
    value: mockStats.completed_projects,
    description: 'This quarter',
    icon: CheckCircle,
    trend: 'up'
  },
  {
    title: 'Team Members',
    value: mockStats.active_users,
    description: `${mockStats.total_users} total users`,
    icon: Users,
    trend: 'up'
  }
];

export function AdminOverview() {
  const recentProjects = mockProjects.slice(0, 3);

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
                    <p className="text-sm text-muted-foreground">{project.client_name}</p>
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
                    <span className="font-medium">{project.completion_percentage}%</span>
                  </div>
                  <Progress value={project.completion_percentage} className="h-2" />
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