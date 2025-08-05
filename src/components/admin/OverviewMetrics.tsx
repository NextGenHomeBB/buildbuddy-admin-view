import { FolderKanban, Clock, CheckCircle, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeviceType } from '@/hooks/useDeviceType';
import { cn } from '@/lib/utils';

interface Stats {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  total_users: number;
  active_users: number;
}

interface OverviewMetricsProps {
  stats: Stats;
}

export function OverviewMetrics({ stats }: OverviewMetricsProps) {
  const deviceType = useDeviceType();

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

  return (
    <div className={cn(
      "grid gap-4",
      deviceType === 'mobile' ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-4"
    )}>
      {statCards.map((stat) => (
        <Card key={stat.title} className="admin-card">
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
  );
}