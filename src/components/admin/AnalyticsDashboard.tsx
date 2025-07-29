import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { Download, TrendingUp, TrendingDown, Users, FolderOpen, CheckSquare, Clock, DollarSign, Calendar } from 'lucide-react';
import { format, subDays, subWeeks, subMonths } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

type TimeRange = '7d' | '30d' | '90d' | '1y';

interface AnalyticsData {
  projects: {
    total: number;
    completed: number;
    active: number;
    planning: number;
    onHold: number;
  };
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    overdue: number;
  };
  workers: {
    total: number;
    active: number;
    hoursThisWeek: number;
  };
  costs: {
    totalBudget: number;
    totalSpent: number;
    pendingPayments: number;
  };
  timeline: Array<{
    date: string;
    projects: number;
    tasks: number;
    hours: number;
  }>;
  productivity: Array<{
    worker: string;
    tasksCompleted: number;
    hoursWorked: number;
    efficiency: number;
  }>;
}

export function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const getDateRange = (range: TimeRange) => {
    const end = new Date();
    let start: Date;
    
    switch (range) {
      case '7d':
        start = subDays(end, 7);
        break;
      case '30d':
        start = subDays(end, 30);
        break;
      case '90d':
        start = subDays(end, 90);
        break;
      case '1y':
        start = subDays(end, 365);
        break;
      default:
        start = subDays(end, 30);
    }
    
    return { start, end };
  };

  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', timeRange],
    queryFn: async (): Promise<AnalyticsData> => {
      const { start, end } = getDateRange(timeRange);

      // Fetch projects data
      const { data: projects } = await supabase
        .from('projects')
        .select('status, budget, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      // Fetch tasks data
      const { data: tasks } = await supabase
        .from('tasks')
        .select('status, created_at, completed_at, end_date, assignee')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      // Fetch worker data
      const { data: workers } = await supabase
        .from('profiles')
        .select('id, full_name');

      // Fetch time tracking data
      const { data: timeSheets } = await supabase
        .from('time_sheets')
        .select('user_id, hours, work_date, profiles!inner(full_name)')
        .gte('work_date', start.toISOString().split('T')[0])
        .lte('work_date', end.toISOString().split('T')[0]);

      // Process data
      const projectStats = {
        total: projects?.length || 0,
        completed: projects?.filter(p => p.status === 'completed').length || 0,
        active: projects?.filter(p => p.status === 'active').length || 0,
        planning: projects?.filter(p => p.status === 'planning').length || 0,
        onHold: projects?.filter(p => p.status === 'on_hold').length || 0,
      };

      const now = new Date();
      const taskStats = {
        total: tasks?.length || 0,
        completed: tasks?.filter(t => t.status === 'done').length || 0,
        inProgress: tasks?.filter(t => t.status === 'in_progress').length || 0,
        todo: tasks?.filter(t => t.status === 'todo').length || 0,
        overdue: tasks?.filter(t => t.end_date && new Date(t.end_date) < now && t.status !== 'done').length || 0,
      };

      const workerStats = {
        total: workers?.length || 0,
        active: timeSheets?.filter(ts => {
          const workDate = new Date(ts.work_date);
          return workDate >= subDays(now, 7);
        }).length || 0,
        hoursThisWeek: timeSheets?.filter(ts => {
          const workDate = new Date(ts.work_date);
          return workDate >= subDays(now, 7);
        }).reduce((sum, ts) => sum + (ts.hours || 0), 0) || 0,
      };

      const totalBudget = projects?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0;

      const costStats = {
        totalBudget,
        totalSpent: totalBudget * 0.6, // Mock data
        pendingPayments: totalBudget * 0.1, // Mock data
      };

      // Generate timeline data
      const timeline: Array<{ date: string; projects: number; tasks: number; hours: number }> = [];
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(now, i);
        const dateStr = format(date, 'MMM dd');
        
        const dayProjects = projects?.filter(p => 
          format(new Date(p.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        ).length || 0;
        
        const dayTasks = tasks?.filter(t => 
          format(new Date(t.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        ).length || 0;
        
        const dayHours = timeSheets?.filter(ts => 
          ts.work_date === format(date, 'yyyy-MM-dd')
        ).reduce((sum, ts) => sum + (ts.hours || 0), 0) || 0;

        timeline.push({
          date: dateStr,
          projects: dayProjects,
          tasks: dayTasks,
          hours: dayHours,
        });
      }

      // Worker productivity data
      const productivity = workers?.map(worker => {
        const workerTimeSheets = timeSheets?.filter(ts => ts.user_id === worker.id) || [];
        const workerTasks = tasks?.filter(t => t.assignee === worker.id && t.status === 'done') || [];
        
        const hoursWorked = workerTimeSheets.reduce((sum, ts) => sum + (ts.hours || 0), 0);
        const tasksCompleted = workerTasks.length;
        const efficiency = hoursWorked > 0 ? tasksCompleted / hoursWorked * 10 : 0;

        return {
          worker: worker.full_name || 'Unknown',
          tasksCompleted,
          hoursWorked,
          efficiency: Math.round(efficiency * 100) / 100,
        };
      }).slice(0, 10) || [];

      return {
        projects: projectStats,
        tasks: taskStats,
        workers: workerStats,
        costs: costStats,
        timeline,
        productivity,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const exportToPDF = () => {
    if (!analytics) return;

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Analytics Report', 20, 30);
    doc.setFontSize(12);
    doc.text(`Generated: ${format(new Date(), 'PPP')}`, 20, 40);
    doc.text(`Time Range: ${timeRange}`, 20, 50);

    // Projects Summary
    doc.setFontSize(16);
    doc.text('Project Overview', 20, 70);
    
    const projectData = [
      ['Total Projects', analytics.projects.total.toString()],
      ['Completed', analytics.projects.completed.toString()],
      ['Active', analytics.projects.active.toString()],
      ['Planning', analytics.projects.planning.toString()],
      ['On Hold', analytics.projects.onHold.toString()],
    ];

    (doc as any).autoTable({
      startY: 80,
      head: [['Metric', 'Value']],
      body: projectData,
      theme: 'striped',
    });

    doc.save('analytics-report.pdf');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-6 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const projectData = [
    { name: 'Completed', value: analytics.projects.completed, color: COLORS[0] },
    { name: 'Active', value: analytics.projects.active, color: COLORS[1] },
    { name: 'Planning', value: analytics.projects.planning, color: COLORS[2] },
    { name: 'On Hold', value: analytics.projects.onHold, color: COLORS[3] },
  ];

  const taskData = [
    { name: 'Completed', value: analytics.tasks.completed, color: COLORS[0] },
    { name: 'In Progress', value: analytics.tasks.inProgress, color: COLORS[1] },
    { name: 'Todo', value: analytics.tasks.todo, color: COLORS[2] },
    { name: 'Overdue', value: analytics.tasks.overdue, color: COLORS[3] },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive insights into your project performance</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToPDF} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.projects.total}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1" />
              {analytics.projects.completed} completed
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.tasks.inProgress}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {analytics.tasks.overdue > 0 ? (
                <>
                  <TrendingDown className="h-3 w-3 mr-1 text-destructive" />
                  {analytics.tasks.overdue} overdue
                </>
              ) : (
                <>
                  <TrendingUp className="h-3 w-3 mr-1" />
                  On track
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.workers.active}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              {analytics.workers.hoursThisWeek}h this week
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Utilization</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((analytics.costs.totalSpent / analytics.costs.totalBudget) * 100).toFixed(1)}%
            </div>
            <Progress 
              value={(analytics.costs.totalSpent / analytics.costs.totalBudget) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
                <CardDescription>Projects and tasks created over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.timeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="projects" stackId="1" stroke={COLORS[0]} fill={COLORS[0]} />
                    <Area type="monotone" dataKey="tasks" stackId="1" stroke={COLORS[1]} fill={COLORS[1]} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Project Status Distribution</CardTitle>
                <CardDescription>Current status of all projects</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={projectData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {projectData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={taskData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill={COLORS[1]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Budget Overview</CardTitle>
                <CardDescription>Financial summary across all projects</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Budget</span>
                    <span className="font-medium">${analytics.costs.totalBudget.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Spent</span>
                    <span className="font-medium">${analytics.costs.totalSpent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Pending Payments</span>
                    <span className="font-medium text-yellow-600">${analytics.costs.pendingPayments.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium border-t pt-2">
                    <span>Remaining</span>
                    <span className="text-green-600">
                      ${(analytics.costs.totalBudget - analytics.costs.totalSpent).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="productivity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Worker Productivity</CardTitle>
              <CardDescription>Tasks completed vs hours worked</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.productivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="worker" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="tasksCompleted" name="Tasks Completed" fill={COLORS[0]} />
                  <Bar dataKey="hoursWorked" name="Hours Worked" fill={COLORS[1]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}