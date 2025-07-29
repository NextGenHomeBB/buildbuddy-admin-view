import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useWorkerProjects } from '@/hooks/useWorkerProjects';
import { useWorkerTasks } from '@/hooks/useWorkerTasks';
import { FolderOpen, CheckSquare, Clock, AlertCircle } from 'lucide-react';

export function WorkerDashboard() {
  const { user } = useAuth();
  
  console.log('WorkerDashboard: Current user:', { 
    id: user?.id, 
    email: user?.email, 
    role: user?.role 
  });
  
  // Get projects assigned to the current user
  const { data: myProjects = [] } = useWorkerProjects();
  
  // Get tasks assigned to the current user
  const { data: myTasks = [] } = useWorkerTasks();
  
  console.log('WorkerDashboard: Tasks data:', { 
    tasksCount: myTasks.length, 
    tasks: myTasks 
  });

  const stats = [
    {
      name: 'Assigned Projects',
      value: myProjects.length,
      icon: FolderOpen,
      color: 'text-blue-600',
    },
    {
      name: 'Total Tasks',
      value: myTasks.length,
      icon: CheckSquare,
      color: 'text-green-600',
    },
    {
      name: 'In Progress',
      value: myTasks.filter(task => task.status === 'in_progress').length,
      icon: Clock,
      color: 'text-yellow-600',
    },
    {
      name: 'Overdue',
      value: 0, // TODO: Calculate overdue tasks
      icon: AlertCircle,
      color: 'text-red-600',
    },
  ];

  // Debug info for the issue
  const isAdmin = user?.role === 'admin';
  const currentUserName = user?.email?.split('@')[0] || 'User';
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hi, {currentUserName}</h1>
        <p className="text-muted-foreground">
          {myTasks.length} tasks assigned
        </p>
        {isAdmin && (
          <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm">
            You are viewing as admin. To see worker tasks, please log in as a worker or use the admin calendar.
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.name}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  </div>
                  <Badge variant={task.status === 'done' ? 'default' : 'secondary'}>
                    {task.status}
                  </Badge>
                </div>
              ))}
              {myTasks.length === 0 && (
                <p className="text-sm text-muted-foreground">No tasks assigned yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myProjects.slice(0, 5).map((project) => (
                <div key={project.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{project.name}</p>
                    <p className="text-sm text-muted-foreground">Role: {project.user_role}</p>
                  </div>
                  <Badge variant="outline">{project.status}</Badge>
                </div>
              ))}
              {myProjects.length === 0 && (
                <p className="text-sm text-muted-foreground">No projects assigned yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
